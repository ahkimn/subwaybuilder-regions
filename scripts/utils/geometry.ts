import { Worker } from 'node:worker_threads';

import { cleanCoords } from '@turf/clean-coords';
import * as turf from '@turf/turf';
import type {
  BBox,
  Feature,
  GeoJsonProperties,
  Geometry,
  MultiPolygon,
  Point,
  Polygon,
} from 'geojson';
import polylabel from 'polylabel';

import {
  bboxIntersects,
  featureBBox,
  isFullyWithinBBox,
  isFullyWithinFeature,
  isFullyWithinPreparedBoundary,
  isPolygonFeature,
  prepareBoundaryContainment,
  shouldUsePreparedBoundaryContainment,
} from '../../lib/geometry/helpers';
import type { DataConfig } from '../extract/handler-types';
import { parseNumber } from './cli';
import { logProgressHeartbeat } from './progress';

// --- Basic Geometry & Helpers --- //
export type BoundaryBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

const DEFAULT_CLIP_WORKER_COUNT = 4;
const SAFE_BBOX_GRID_LEVELS = [8, 16, 32] as const;

type ClipCandidate = {
  sourceFeature: Feature<Polygon | MultiPolygon>;
  featureBBox: BBox;
};

type BoundaryClipChunk = {
  feature: Feature<Polygon>;
  bbox: BBox;
};

type SafeBoundaryBBoxIndex = {
  bboxes: BBox[];
  buildMs: number;
};

type ClipWorkerResult = {
  index: number;
  clippedRegion: Feature<Geometry, GeoJsonProperties> | null;
  clippingDurationMs: number;
};

export function isFeatureCollection(
  geoJson: GeoJSON.GeoJSON,
): geoJson is GeoJSON.FeatureCollection {
  return geoJson.type === 'FeatureCollection';
}

export function bboxToGeometryString(bbox: BoundaryBox): string {
  return `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
}

export function expandBBox(
  bbox: BoundaryBox,
  paddingDegrees: number,
): BoundaryBox {
  return {
    west: bbox.west - paddingDegrees,
    south: bbox.south - paddingDegrees,
    east: bbox.east + paddingDegrees,
    north: bbox.north + paddingDegrees,
  };
}

// --- Label Point Calculation --- //

type LabelCandidate = {
  lat: number;
  lng: number;
  method: string;
  withinPolygon: boolean;
};

type LabelPointResult = {
  primary: LabelCandidate;
  candidates?: LabelCandidate[];
};

type GeometryFilterStats = {
  processedFeatures?: number;
  polygonFeatures?: number;
  bboxPrefilterPassed?: number;
  safeBBoxWithinCount?: number;
  fullyWithinCount?: number;
  clippedCount?: number;
  rejectedNoIntersectionCount?: number;
  withinCheckMs?: number;
  intersectsCheckMs?: number;
  clippingMs?: number;
  propertiesMs?: number;
};

type UnitTypeProperties = {
  UNIT_TYPE: string;
  UNIT_TYPE_CODE: string;
};

function incrementGeometryFilterStat(
  stats: GeometryFilterStats,
  key: keyof Pick<
    GeometryFilterStats,
    | 'processedFeatures'
    | 'polygonFeatures'
    | 'bboxPrefilterPassed'
    | 'safeBBoxWithinCount'
    | 'fullyWithinCount'
    | 'clippedCount'
    | 'rejectedNoIntersectionCount'
  >,
  amount = 1,
): void {
  stats[key] = (stats[key] ?? 0) + amount;
}

function addGeometryFilterTiming(
  stats: GeometryFilterStats,
  key: keyof Pick<
    GeometryFilterStats,
    'withinCheckMs' | 'intersectsCheckMs' | 'clippingMs' | 'propertiesMs'
  >,
  durationMs: number,
): void {
  stats[key] = (stats[key] ?? 0) + durationMs;
}

function formatGeometryFilterSummary(
  progressLabel: string,
  totalFeatures: number,
  outputCount: number,
  stats: GeometryFilterStats,
): string {
  return `[Geometry] ${progressLabel} summary | total: ${totalFeatures}, polygon: ${stats.polygonFeatures ?? 0}, bbox-pass: ${stats.bboxPrefilterPassed ?? 0}, safe-bbox-within: ${stats.safeBBoxWithinCount ?? 0}, fully-within: ${stats.fullyWithinCount ?? 0}, clipped: ${stats.clippedCount ?? 0}, no-intersection: ${stats.rejectedNoIntersectionCount ?? 0}, output: ${outputCount} | timings ms within: ${(stats.withinCheckMs ?? 0).toFixed(2)}, intersects: ${(stats.intersectsCheckMs ?? 0).toFixed(2)}, clip: ${(stats.clippingMs ?? 0).toFixed(2)}, props: ${(stats.propertiesMs ?? 0).toFixed(2)}`;
}

function hasNonEmptyPolygonCoordinates(
  feature: Feature<Polygon | MultiPolygon>,
): boolean {
  if (feature.geometry.type === 'Polygon') {
    return feature.geometry.coordinates.length > 0;
  }

  return feature.geometry.coordinates.length > 0;
}

function resolveUnitTypeProperties(
  featureProperties: GeoJsonProperties,
  dataConfig: DataConfig,
  unmappedUnitTypeCodes: Set<string>,
): UnitTypeProperties | null {
  const unitTypeProperty = dataConfig.unitTypeProperty;
  const unitTypeCodeMap = dataConfig.unitTypeCodeMap;
  if (!unitTypeProperty || !unitTypeCodeMap) return null;

  const rawCode = featureProperties![unitTypeProperty];
  if (rawCode == null) return null;

  const code = String(rawCode).trim().toUpperCase();
  if (!code) return null;

  const unitType = unitTypeCodeMap[code];
  if (!unitType) {
    if (!unmappedUnitTypeCodes.has(code)) {
      unmappedUnitTypeCodes.add(code);
      console.warn(
        `Unmapped ${unitTypeProperty} code "${code}" for dataset ${dataConfig.datasetId}`,
      );
    }
    return null;
  }

  return {
    UNIT_TYPE: unitType,
    UNIT_TYPE_CODE: code,
  };
}

function getLargestPolygon(feature: Feature<MultiPolygon>): Polygon {
  let maxArea = -Infinity;
  let largestPolygon: Polygon | null = null;

  for (const coords of feature.geometry.coordinates) {
    const poly: Polygon = {
      type: 'Polygon',
      coordinates: coords,
    };
    const area = turf.area(poly);
    if (area > maxArea) {
      maxArea = area;
      largestPolygon = poly;
    }
  }

  if (!largestPolygon) {
    throw new Error('MultiPolygon has no valid polygons');
  }

  return largestPolygon;
}

function buildLabelCandidate(
  feature: Feature<Polygon | MultiPolygon>,
  method: string,
  point: Feature<Point>,
): LabelCandidate {
  return {
    method,
    lat: point.geometry.coordinates[1],
    lng: point.geometry.coordinates[0],
    withinPolygon: turf.booleanPointInPolygon(point, feature),
  };
}

const LABEL_POINT_METHODS = [
  'polylabel',
  'pointOnFeature',
  'centerOfMass',
  'centroid',
] as const;

type LabelPointMethod = (typeof LABEL_POINT_METHODS)[number];

function tryGetLabelCandidatePoint(
  feature: Feature<Polygon | MultiPolygon>,
  method: LabelPointMethod,
): Feature<Point> | null {
  const coords =
    feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates
      : getLargestPolygon(feature as Feature<MultiPolygon>).coordinates;

  if (!coords || coords.length === 0) {
    throw new Error('Feature has no valid coordinates');
  }

  try {
    switch (method) {
      case 'polylabel':
        return turf.point(polylabel(coords, 1e-6));
      case 'pointOnFeature':
        return turf.pointOnFeature(feature);
      case 'centerOfMass':
        return turf.centerOfMass(feature);
      case 'centroid':
        return turf.centroid(feature);
      default:
        return null;
    }
  } catch (err) {
    console.warn(`\tFailed to compute ${method} for feature:`, feature.id, err);
    return null;
  }
}

export function resolvePrimaryLabelPoint(
  feature: Feature<Polygon | MultiPolygon>,
): { lat: number; lng: number } {
  return resolveLabelPointResult(feature, false).primary;
}

function resolveLabelPointResult(
  feature: Feature<Polygon | MultiPolygon>,
  includeCandidates: boolean,
): LabelPointResult {
  if (!includeCandidates) {
    let fallbackCandidate: LabelCandidate | null = null;

    for (const method of LABEL_POINT_METHODS) {
      const point = tryGetLabelCandidatePoint(feature, method);
      if (!point) {
        continue;
      }
      const candidate = buildLabelCandidate(feature, method, point);
      if (!fallbackCandidate) {
        fallbackCandidate = candidate;
      }
      if (candidate.withinPolygon) {
        return { primary: candidate };
      }
    }

    if (!fallbackCandidate) {
      throw new Error(
        'Unable to determine label point for feature: ' + feature.id,
      );
    }

    return { primary: fallbackCandidate };
  }

  const candidates = LABEL_POINT_METHODS.map((method) => {
    const point = tryGetLabelCandidatePoint(feature, method);
    return point ? buildLabelCandidate(feature, method, point) : null;
  }).filter((candidate): candidate is LabelCandidate => candidate !== null);

  if (candidates.length === 0) {
    throw new Error(
      'Unable to determine label point for feature: ' + feature.id,
    );
  }
  const primary =
    candidates.find((candidate) => candidate.withinPolygon) || candidates[0];

  return includeCandidates
    ? {
        primary,
        candidates,
      }
    : { primary };
}

// --- Boundary Filtering and Clipping --- //

export function filterAndClipRegionsToBoundary(
  shapeJSON: GeoJSON.FeatureCollection,
  bbox: BoundaryBox,
  dataConfig: DataConfig,
  options?: {
    includeLabelPointCandidates?: boolean;
    progressLabel?: string;
    heartbeatPercentStep?: number;
  },
): Array<Feature<Geometry, GeoJsonProperties>> {
  const bboxPolygon = turf.bboxPolygon([
    bbox.west,
    bbox.south,
    bbox.east,
    bbox.north,
  ]);

  return filterAndClipRegionsToMask(shapeJSON, bboxPolygon, dataConfig, {
    withinBoundaryCheck: (feature, boundaryFeature, currentFeatureBBox) =>
      isFullyWithinBBox(
        feature,
        boundaryFeature as Feature<Polygon>,
        currentFeatureBBox,
      ),
    includeLabelPointCandidates: options?.includeLabelPointCandidates,
    progressLabel: options?.progressLabel,
    heartbeatPercentStep: options?.heartbeatPercentStep,
  });
}

export function filterAndClipRegionsToBoundaryGeometry(
  shapeJSON: GeoJSON.FeatureCollection,
  boundaryFeature: Feature<Polygon | MultiPolygon>,
  dataConfig: DataConfig,
  options?: {
    includeLabelPointCandidates?: boolean;
    progressLabel?: string;
    heartbeatPercentStep?: number;
  },
): Array<Feature<Geometry, GeoJsonProperties>> {
  const preparedBoundary = prepareBoundaryContainment(boundaryFeature);
  const usePreparedContainment =
    shouldUsePreparedBoundaryContainment(preparedBoundary);
  return filterAndClipRegionsToMask(shapeJSON, boundaryFeature, dataConfig, {
    withinBoundaryCheck: (feature, _maskFeature, currentFeatureBBox) =>
      usePreparedContainment
        ? isFullyWithinPreparedBoundary(
            feature,
            preparedBoundary,
            currentFeatureBBox,
          )
        : isFullyWithinFeature(
            feature,
            boundaryFeature,
            'boundary',
            currentFeatureBBox,
          ),
    includeLabelPointCandidates: options?.includeLabelPointCandidates,
    progressLabel: options?.progressLabel,
    heartbeatPercentStep: options?.heartbeatPercentStep,
  });
}

export async function filterAndClipRegionsToBoundaryGeometryAsync(
  shapeJSON: GeoJSON.FeatureCollection,
  boundaryFeature: Feature<Polygon | MultiPolygon>,
  dataConfig: DataConfig,
  options?: {
    includeLabelPointCandidates?: boolean;
    progressLabel?: string;
    heartbeatPercentStep?: number;
    workerCount?: number;
  },
): Promise<Array<Feature<Geometry, GeoJsonProperties>>> {
  const includeLabelPointCandidates =
    options?.includeLabelPointCandidates ?? false;
  const progressLabel = options?.progressLabel;
  const heartbeatPercentStep = options?.heartbeatPercentStep ?? 10;
  const results = new Array<Feature<Geometry, GeoJsonProperties>>();
  const unmappedUnitTypeCodes = new Set<string>();
  const preparedBoundary = prepareBoundaryContainment(boundaryFeature);
  const usePreparedContainment =
    shouldUsePreparedBoundaryContainment(preparedBoundary);
  const safeBoundaryBBoxes = buildSafeBoundaryBBoxIndex(boundaryFeature);
  const totalFeatures = shapeJSON.features.length;
  const stats: GeometryFilterStats = {};
  const clipCandidates: ClipCandidate[] = [];

  for (const feature of shapeJSON.features) {
    incrementGeometryFilterStat(stats, 'processedFeatures');
    if (progressLabel) {
      logProgressHeartbeat(
        '[Geometry]',
        progressLabel,
        stats.processedFeatures ?? 0,
        totalFeatures,
        heartbeatPercentStep,
      );
    }

    if (!isPolygonFeature(feature)) {
      continue;
    }
    incrementGeometryFilterStat(stats, 'polygonFeatures');

    const currentFeatureBBox = featureBBox(feature);
    if (!bboxIntersects(preparedBoundary.bbox, currentFeatureBBox)) {
      continue;
    }
    incrementGeometryFilterStat(stats, 'bboxPrefilterPassed');

    let fullyWithinBoundary = isBBoxWithinAnyBBox(
      currentFeatureBBox,
      safeBoundaryBBoxes.bboxes,
    );
    if (fullyWithinBoundary) {
      incrementGeometryFilterStat(stats, 'safeBBoxWithinCount');
    } else {
      const withinCheckStart = performance.now();
      fullyWithinBoundary = usePreparedContainment
        ? isFullyWithinPreparedBoundary(
            feature,
            preparedBoundary,
            currentFeatureBBox,
          )
        : isFullyWithinFeature(
            feature,
            boundaryFeature,
            'boundary',
            currentFeatureBBox,
          );
      addGeometryFilterTiming(
        stats,
        'withinCheckMs',
        performance.now() - withinCheckStart,
      );
    }

    if (
      !fullyWithinBoundary &&
      (() => {
        const intersectsCheckStart = performance.now();
        const intersects = turf.booleanIntersects(boundaryFeature, feature);
        addGeometryFilterTiming(
          stats,
          'intersectsCheckMs',
          performance.now() - intersectsCheckStart,
        );
        return !intersects;
      })()
    ) {
      incrementGeometryFilterStat(stats, 'rejectedNoIntersectionCount');
      continue;
    }

    if (fullyWithinBoundary) {
      incrementGeometryFilterStat(stats, 'fullyWithinCount');
      const propertiesStart = performance.now();
      feature.properties = buildRegionProperties(
        feature,
        feature,
        dataConfig,
        true,
        unmappedUnitTypeCodes,
        includeLabelPointCandidates,
      );
      addGeometryFilterTiming(
        stats,
        'propertiesMs',
        performance.now() - propertiesStart,
      );
      feature.id = feature.id;
      results.push(feature);
      continue;
    }

    clipCandidates.push({
      sourceFeature: feature,
      featureBBox: currentFeatureBBox,
    });
  }

  const clippingStart = performance.now();
  const boundaryClipChunks = buildBoundaryClipChunks(boundaryFeature);
  const clippedRegions = await clipCandidatesWithWorkers(
    clipCandidates,
    boundaryClipChunks,
    options?.workerCount ?? DEFAULT_CLIP_WORKER_COUNT,
  );
  addGeometryFilterTiming(
    stats,
    'clippingMs',
    performance.now() - clippingStart,
  );

  for (let index = 0; index < clipCandidates.length; index += 1) {
    const candidate = clipCandidates[index];
    const clippedRegion = clippedRegions[index];
    if (!clippedRegion || !isPolygonFeature(clippedRegion)) {
      console.warn(
        'No valid intersection geometry for feature:',
        candidate.sourceFeature.id,
      );
      continue;
    }

    incrementGeometryFilterStat(stats, 'clippedCount');
    const propertiesStart = performance.now();
    clippedRegion.properties = buildRegionProperties(
      candidate.sourceFeature,
      clippedRegion,
      dataConfig,
      false,
      unmappedUnitTypeCodes,
      includeLabelPointCandidates,
    );
    addGeometryFilterTiming(
      stats,
      'propertiesMs',
      performance.now() - propertiesStart,
    );
    clippedRegion.id = candidate.sourceFeature.id;
    results.push(clippedRegion);
  }

  if (progressLabel) {
    console.log(
      `${formatGeometryFilterSummary(progressLabel, totalFeatures, results.length, stats)} | within-mode: ${usePreparedContainment ? 'prepared' : 'turf'}, safe-bboxes: ${safeBoundaryBBoxes.bboxes.length}, safe-bbox-build-ms: ${safeBoundaryBBoxes.buildMs.toFixed(2)}, workers: ${Math.min(options?.workerCount ?? DEFAULT_CLIP_WORKER_COUNT, Math.max(clipCandidates.length, 1))}, clip-candidates: ${clipCandidates.length}, boundary-chunks: ${boundaryClipChunks.length}`,
    );
  }

  return results;
}

export function buildRegionsWithoutClipping(
  shapeJSON: GeoJSON.FeatureCollection,
  dataConfig: DataConfig,
  options?: {
    includeLabelPointCandidates?: boolean;
  },
): Array<Feature<Geometry, GeoJsonProperties>> {
  const results = new Array<Feature<Geometry, GeoJsonProperties>>();
  const unmappedUnitTypeCodes = new Set<string>();

  for (const feature of shapeJSON.features) {
    if (!isPolygonFeature(feature)) {
      continue;
    }

    feature.properties = buildRegionProperties(
      feature,
      feature,
      dataConfig,
      true,
      unmappedUnitTypeCodes,
      options?.includeLabelPointCandidates ?? false,
    );
    feature.id = feature.id;
    results.push(feature);
  }

  return results;
}

function filterAndClipRegionsToMask(
  shapeJSON: GeoJSON.FeatureCollection,
  boundaryFeature: Feature<Polygon | MultiPolygon>,
  dataConfig: DataConfig,
  options: {
    withinBoundaryCheck: (
      feature: Feature<Polygon | MultiPolygon>,
      boundaryFeature: Feature<Polygon | MultiPolygon>,
      featureBBox: BBox,
    ) => boolean;
    includeLabelPointCandidates?: boolean;
    progressLabel?: string;
    heartbeatPercentStep?: number;
  },
): Array<Feature<Geometry, GeoJsonProperties>> {
  const {
    withinBoundaryCheck,
    includeLabelPointCandidates = false,
    progressLabel,
    heartbeatPercentStep = 10,
  } = options;

  const results = new Array<Feature<Geometry, GeoJsonProperties>>();
  const unmappedUnitTypeCodes = new Set<string>();
  const boundaryBBox = featureBBox(boundaryFeature);
  const totalFeatures = shapeJSON.features.length;
  const stats: GeometryFilterStats = {};

  for (const feature of shapeJSON.features) {
    incrementGeometryFilterStat(stats, 'processedFeatures');
    if (progressLabel) {
      logProgressHeartbeat(
        '[Geometry]',
        progressLabel,
        stats.processedFeatures ?? 0,
        totalFeatures,
        heartbeatPercentStep,
      );
    }

    if (!isPolygonFeature(feature)) {
      continue;
    }
    incrementGeometryFilterStat(stats, 'polygonFeatures');

    const currentFeatureBBox = featureBBox(feature);
    if (!bboxIntersects(boundaryBBox, currentFeatureBBox)) {
      continue;
    }
    incrementGeometryFilterStat(stats, 'bboxPrefilterPassed');

    const withinCheckStart = performance.now();
    const fullyWithinBoundary = withinBoundaryCheck(
      feature,
      boundaryFeature,
      currentFeatureBBox,
    );
    addGeometryFilterTiming(
      stats,
      'withinCheckMs',
      performance.now() - withinCheckStart,
    );
    if (
      !fullyWithinBoundary &&
      (() => {
        const intersectsCheckStart = performance.now();
        const intersects = turf.booleanIntersects(boundaryFeature, feature);
        addGeometryFilterTiming(
          stats,
          'intersectsCheckMs',
          performance.now() - intersectsCheckStart,
        );
        return !intersects;
      })()
    ) {
      incrementGeometryFilterStat(stats, 'rejectedNoIntersectionCount');
      continue;
    }
    if (fullyWithinBoundary) {
      incrementGeometryFilterStat(stats, 'fullyWithinCount');
    }

    let clippedRegion: Feature<Geometry, GeoJsonProperties>;
    if (fullyWithinBoundary) {
      clippedRegion = feature;
    } else {
      const clippingStart = performance.now();
      const intersection = turf.intersect(
        turf.featureCollection([feature, boundaryFeature]),
      );
      addGeometryFilterTiming(
        stats,
        'clippingMs',
        performance.now() - clippingStart,
      );
      if (!intersection || !isPolygonFeature(intersection)) {
        console.warn('No valid intersection geometry for feature:', feature.id);
        continue;
      }

      if (hasNonEmptyPolygonCoordinates(intersection)) {
        clippedRegion = intersection;
      } else {
        const cleanedIntersection = cleanCoords(intersection);
        if (
          !isPolygonFeature(cleanedIntersection) ||
          !hasNonEmptyPolygonCoordinates(cleanedIntersection)
        ) {
          // Handle edge case of touching/malformed geometry
          console.warn(
            'No valid intersection geometry for feature:',
            feature.id,
          );
          continue;
        }

        clippedRegion = cleanedIntersection;
      }
      incrementGeometryFilterStat(stats, 'clippedCount');
    }

    const propertiesStart = performance.now();
    clippedRegion.properties = buildRegionProperties(
      feature,
      clippedRegion,
      dataConfig,
      fullyWithinBoundary,
      unmappedUnitTypeCodes,
      includeLabelPointCandidates,
    );
    addGeometryFilterTiming(
      stats,
      'propertiesMs',
      performance.now() - propertiesStart,
    );
    clippedRegion.id = feature.id;

    results.push(clippedRegion);
  }

  if (progressLabel) {
    console.log(
      formatGeometryFilterSummary(
        progressLabel,
        totalFeatures,
        results.length,
        stats,
      ),
    );
  }
  return results;
}

function buildBoundaryClipChunks(
  boundaryFeature: Feature<Polygon | MultiPolygon>,
): BoundaryClipChunk[] {
  if (boundaryFeature.geometry.type === 'Polygon') {
    return [
      {
        feature: boundaryFeature as Feature<Polygon>,
        bbox: featureBBox(boundaryFeature),
      },
    ];
  }

  return boundaryFeature.geometry.coordinates.map((coordinates, index) => {
    const feature = turf.polygon(
      coordinates,
      boundaryFeature.properties ?? {},
      { id: `${boundaryFeature.id ?? 'boundary'}-${index}` },
    );
    return {
      feature,
      bbox: featureBBox(feature),
    };
  });
}

function buildSafeBoundaryBBoxIndex(
  boundaryFeature: Feature<Polygon | MultiPolygon>,
): SafeBoundaryBBoxIndex {
  const buildStart = performance.now();
  const boundaryBBox = featureBBox(boundaryFeature);
  const safeBBoxes: BBox[] = [];

  for (const gridSize of SAFE_BBOX_GRID_LEVELS) {
    const lngStep = (boundaryBBox[2] - boundaryBBox[0]) / gridSize;
    const latStep = (boundaryBBox[3] - boundaryBBox[1]) / gridSize;
    if (lngStep <= 0 || latStep <= 0) {
      continue;
    }

    for (let xIndex = 0; xIndex < gridSize; xIndex += 1) {
      for (let yIndex = 0; yIndex < gridSize; yIndex += 1) {
        const cellBBox: BBox = [
          boundaryBBox[0] + lngStep * xIndex,
          boundaryBBox[1] + latStep * yIndex,
          xIndex === gridSize - 1
            ? boundaryBBox[2]
            : boundaryBBox[0] + lngStep * (xIndex + 1),
          yIndex === gridSize - 1
            ? boundaryBBox[3]
            : boundaryBBox[1] + latStep * (yIndex + 1),
        ];
        if (turf.booleanContains(boundaryFeature, turf.bboxPolygon(cellBBox))) {
          safeBBoxes.push(cellBBox);
        }
      }
    }
  }

  return {
    bboxes: safeBBoxes,
    buildMs: performance.now() - buildStart,
  };
}

function isBBoxWithinAnyBBox(featureBBoxValue: BBox, containerBBoxes: readonly BBox[]): boolean {
  return containerBBoxes.some(
    (containerBBox) =>
      featureBBoxValue[0] >= containerBBox[0] &&
      featureBBoxValue[1] >= containerBBox[1] &&
      featureBBoxValue[2] <= containerBBox[2] &&
      featureBBoxValue[3] <= containerBBox[3],
  );
}

async function clipCandidatesWithWorkers(
  clipCandidates: readonly ClipCandidate[],
  boundaryClipChunks: readonly BoundaryClipChunk[],
  workerCount: number,
): Promise<Array<Feature<Geometry, GeoJsonProperties> | null>> {
  if (clipCandidates.length === 0) {
    return [];
  }

  const resolvedWorkerCount = Math.min(
    Math.max(1, workerCount),
    clipCandidates.length,
  );
  if (resolvedWorkerCount === 1) {
    return clipCandidates.map(({ sourceFeature }) =>
      intersectFeatureWithBoundaryChunks(sourceFeature, boundaryClipChunks),
    );
  }

  const batches = Array.from(
    { length: resolvedWorkerCount },
    () =>
      [] as Array<{
        index: number;
        feature: Feature<Polygon | MultiPolygon>;
        featureBBox: BBox;
      }>,
  );
  clipCandidates.forEach((candidate, index) => {
    batches[index % resolvedWorkerCount].push({
      index,
      feature: candidate.sourceFeature,
      featureBBox: candidate.featureBBox,
    });
  });

  try {
    const workerResults = await Promise.all(
      batches
        .filter((batch) => batch.length > 0)
        .map((batch) => runClipWorkerBatch(batch, boundaryClipChunks)),
    );

    const clippedRegions = new Array<Feature<
      Geometry,
      GeoJsonProperties
    > | null>(clipCandidates.length).fill(null);
    for (const batchResults of workerResults) {
      for (const result of batchResults) {
        clippedRegions[result.index] = result.clippedRegion;
      }
    }
    return clippedRegions;
  } catch (error) {
    console.warn(
      '[Geometry] Parallel clipping failed; falling back to single-threaded clipping.',
      error,
    );
    return clipCandidates.map(({ sourceFeature }) =>
      intersectFeatureWithBoundaryChunks(sourceFeature, boundaryClipChunks),
    );
  }
}

function runClipWorkerBatch(
  batch: Array<{
    index: number;
    feature: Feature<Polygon | MultiPolygon>;
    featureBBox: BBox;
  }>,
  boundaryClipChunks: readonly BoundaryClipChunk[],
): Promise<ClipWorkerResult[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./geometry-clip-worker.cjs', import.meta.url),
      {
        workerData: {
          boundaryClipChunks,
          batch,
        },
      },
    );

    worker.once('message', (message: ClipWorkerResult[]) => {
      resolve(message);
    });
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Clip worker exited with code ${code}`));
      }
    });
  });
}

function intersectFeatureWithBoundaryChunks(
  feature: Feature<Polygon | MultiPolygon>,
  boundaryClipChunks: readonly BoundaryClipChunk[],
): Feature<Geometry, GeoJsonProperties> | null {
  const currentFeatureBBox = featureBBox(feature);
  const matchingChunks = boundaryClipChunks.filter((chunk) =>
    bboxIntersects(chunk.bbox, currentFeatureBBox),
  );
  if (matchingChunks.length === 0) {
    return null;
  }

  if (matchingChunks.length === 1) {
    return intersectFeatureWithBoundary(feature, matchingChunks[0].feature);
  }

  const intersections = matchingChunks.flatMap((chunk) => {
    const intersection = intersectFeatureWithBoundary(feature, chunk.feature);
    return intersection && isPolygonFeature(intersection) ? [intersection] : [];
  });
  if (intersections.length === 0) {
    return null;
  }
  if (intersections.length === 1) {
    return intersections[0];
  }

  return combinePolygonIntersections(intersections);
}

function intersectFeatureWithBoundary(
  feature: Feature<Polygon | MultiPolygon>,
  boundaryFeature: Feature<Polygon | MultiPolygon>,
): Feature<Geometry, GeoJsonProperties> | null {
  const intersection = turf.intersect(
    turf.featureCollection([feature, boundaryFeature]),
  );
  if (!intersection || !isPolygonFeature(intersection)) {
    return null;
  }
  if (hasNonEmptyPolygonCoordinates(intersection)) {
    return intersection;
  }

  const cleanedIntersection = cleanCoords(intersection);
  if (
    !isPolygonFeature(cleanedIntersection) ||
    !hasNonEmptyPolygonCoordinates(cleanedIntersection)
  ) {
    return null;
  }

  return cleanedIntersection;
}

function combinePolygonIntersections(
  intersections: Array<Feature<Polygon | MultiPolygon>>,
): Feature<MultiPolygon, GeoJsonProperties> | null {
  const coordinates = intersections.flatMap((intersection) =>
    intersection.geometry.type === 'Polygon'
      ? [intersection.geometry.coordinates]
      : intersection.geometry.coordinates,
  );

  return coordinates.length > 0 ? turf.multiPolygon(coordinates) : null;
}

// Basic properties builder for region features, which also handles label point calculation and population/unit type property resolution if applicable.
// The source feature is used as the basis for properties like ID and NAME, while the output (potentially clipped) feature is used for calculating label points and area-based properties.
function buildRegionProperties(
  sourceFeature: Feature<Polygon | MultiPolygon>,
  outputFeature: Feature<Geometry, GeoJsonProperties>,
  dataConfig: DataConfig,
  fullyWithinBoundary: boolean,
  unmappedUnitTypeCodes: Set<string>,
  includeLabelPointCandidates: boolean,
): GeoJsonProperties {
  const targetLabelFeature = fullyWithinBoundary
    ? sourceFeature
    : (outputFeature as Feature<Polygon | MultiPolygon>);
  const precomputedLabel =
    !includeLabelPointCandidates &&
    tryResolveReusablePrecomputedPrimaryLabel(
      sourceFeature.properties,
      targetLabelFeature,
      fullyWithinBoundary,
    );
  const labelPointResult = precomputedLabel
    ? { primary: precomputedLabel }
    : resolveLabelPointResult(targetLabelFeature, includeLabelPointCandidates);
  const featureProperties = sourceFeature.properties!;
  const primaryLabel = labelPointResult.primary;
  const outputAreaKm2 = turf.area(outputFeature) / 1_000_000;
  const precomputedTotalAreaKm2 = parseNumber(featureProperties.TOTAL_AREA);
  const totalAreaKm2 = fullyWithinBoundary
    ? outputAreaKm2
    : typeof precomputedTotalAreaKm2 === 'number'
      ? precomputedTotalAreaKm2
      : turf.area(sourceFeature) / 1_000_000;

  let regionProperties: GeoJsonProperties = {
    ID: featureProperties[dataConfig.idProperty]!,
    NAME: featureProperties[dataConfig.nameProperty]!,
    DISPLAY_NAME: dataConfig.applicableNameProperties
      ?.map((key) => featureProperties[key])
      .find(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      )!,
    LAT: primaryLabel.lat,
    LNG: primaryLabel.lng,
    WITHIN_BBOX: fullyWithinBoundary,
    AREA_WITHIN_BBOX: outputAreaKm2,
    TOTAL_AREA: totalAreaKm2,
  };

  if (includeLabelPointCandidates) {
    regionProperties = {
      ...regionProperties,
      LABEL_POINTS: {
        primary: { lat: primaryLabel.lat, lng: primaryLabel.lng },
        candidates: labelPointResult.candidates,
      },
    };
  }

  if (
    dataConfig.populationProperty &&
    featureProperties[dataConfig.populationProperty] != null
  ) {
    const populationValue = featureProperties[dataConfig.populationProperty]!;
    regionProperties = {
      ...regionProperties,
      POPULATION: parseNumber(populationValue),
    };
  }

  const unitTypeProperties = resolveUnitTypeProperties(
    featureProperties,
    dataConfig,
    unmappedUnitTypeCodes,
  );
  if (unitTypeProperties) {
    regionProperties = {
      ...regionProperties,
      ...unitTypeProperties,
    };
  }

  return regionProperties;
}

function resolvePrecomputedPrimaryLabel(
  properties: GeoJsonProperties | null | undefined,
): LabelCandidate | null {
  const lat = parseNumber(properties?.LAT);
  const lng = parseNumber(properties?.LNG);
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  return {
    lat,
    lng,
    method: 'precomputed',
    withinPolygon: true,
  };
}

function tryResolveReusablePrecomputedPrimaryLabel(
  properties: GeoJsonProperties | null | undefined,
  targetFeature: Feature<Polygon | MultiPolygon>,
  fullyWithinBoundary: boolean,
): LabelCandidate | null {
  const precomputed = resolvePrecomputedPrimaryLabel(properties);
  if (!precomputed) {
    return null;
  }
  if (fullyWithinBoundary) {
    return precomputed;
  }

  const point = turf.point([precomputed.lng, precomputed.lat]);
  return turf.booleanPointInPolygon(point, targetFeature) ? precomputed : null;
}
