import { cleanCoords } from '@turf/clean-coords';
import * as turf from '@turf/turf';
import type {
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
  isPolygonFeature,
} from '../../src/core/geometry/helpers';
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

type UnitTypeProperties = {
  UNIT_TYPE: string;
  UNIT_TYPE_CODE: string;
};

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
    console.warn(
      `\tFailed to compute ${method} for feature:`,
      feature.id,
      err,
    );
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
    withinBoundaryCheck: (feature, boundaryFeature) =>
      isFullyWithinBBox(feature, boundaryFeature as Feature<Polygon>),
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
  return filterAndClipRegionsToMask(shapeJSON, boundaryFeature, dataConfig, {
    withinBoundaryCheck: (feature, maskFeature) =>
      isFullyWithinFeature(feature, maskFeature, 'boundary geometry'),
    includeLabelPointCandidates: options?.includeLabelPointCandidates,
    progressLabel: options?.progressLabel,
    heartbeatPercentStep: options?.heartbeatPercentStep,
  });
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
  let processedFeatures = 0;

  for (const feature of shapeJSON.features) {
    processedFeatures += 1;
    if (progressLabel) {
      logProgressHeartbeat(
        '[Geometry]',
        progressLabel,
        processedFeatures,
        totalFeatures,
        heartbeatPercentStep,
      );
    }

    if (!isPolygonFeature(feature)) {
      continue;
    }

    const currentFeatureBBox = featureBBox(feature);
    if (!bboxIntersects(boundaryBBox, currentFeatureBBox)) {
      continue;
    }

    const fullyWithinBoundary = withinBoundaryCheck(feature, boundaryFeature);
    if (
      !fullyWithinBoundary &&
      !turf.booleanIntersects(boundaryFeature, feature)
    ) {
      continue;
    }

    let clippedRegion: Feature<Geometry, GeoJsonProperties>;
    if (fullyWithinBoundary) {
      clippedRegion = feature;
    } else {
      const intersection = turf.intersect(
        turf.featureCollection([feature, boundaryFeature]),
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
    }

    clippedRegion.properties = buildRegionProperties(
      feature,
      clippedRegion,
      dataConfig,
      fullyWithinBoundary,
      unmappedUnitTypeCodes,
      includeLabelPointCandidates,
    );
    clippedRegion.id = feature.id;

    results.push(clippedRegion);
  }
  return results;
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
    : resolveLabelPointResult(
        targetLabelFeature,
        includeLabelPointCandidates,
      );
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
