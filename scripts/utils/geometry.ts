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
  isFullyWithinBBox,
  isPolygonFeature,
} from '../../src/core/geometry/helpers';
import type { DataConfig } from '../extract/handler-types';
import { parseNumber } from './cli';

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

type UnitTypeProperties = {
  UNIT_TYPE: string;
  UNIT_TYPE_CODE: string;
};

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

function getLabelCandidates(
  feature: Feature<Polygon | MultiPolygon>,
): LabelCandidate[] {
  const candidates: Array<{ method: string; point: Feature<Point> }> = [];

  const coords =
    feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates
      : getLargestPolygon(feature as Feature<MultiPolygon>).coordinates;

  if (!coords || coords.length === 0) {
    throw new Error('Feature has no valid coordinates');
  }

  try {
    candidates.push({
      method: 'polylabel',
      point: turf.point(polylabel(coords, 1e-6)),
    });
  } catch (err) {
    console.warn('\tFailed to compute polylabel for feature:', feature.id, err);
  }

  try {
    candidates.push({
      method: 'pointOnFeature',
      point: turf.pointOnFeature(feature),
    });
  } catch (err) {
    console.warn(
      '\tFailed to compute pointOnFeature for feature:',
      feature.id,
      err,
    );
  }

  try {
    candidates.push({
      method: 'centerOfMass',
      point: turf.centerOfMass(feature),
    });
  } catch (err) {
    console.warn(
      '\tFailed to compute centerOfMass for feature:',
      feature.id,
      err,
    );
  }

  try {
    candidates.push({
      method: 'centroid',
      point: turf.centroid(feature),
    });
  } catch (err) {
    console.warn('\tFailed to compute centroid for feature:', feature.id, err);
  }

  if (candidates.length === 0) {
    throw new Error(
      'Unable to determine label point for feature: ' + feature.id,
    );
  }

  return candidates.map(({ method, point }) => ({
    method: method,
    lat: point.geometry.coordinates[1],
    lng: point.geometry.coordinates[0],
    withinPolygon: turf.booleanPointInPolygon(point, feature),
  }));
}

// --- Boundary Filtering and Clipping --- //

export function filterAndClipRegionsToBoundary(
  shapeJSON: GeoJSON.FeatureCollection,
  bbox: BoundaryBox,
  dataConfig: DataConfig,
  options?: {
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
    progressLabel: options?.progressLabel,
    heartbeatPercentStep: options?.heartbeatPercentStep,
  });
}

export function filterAndClipRegionsToBoundaryGeometry(
  shapeJSON: GeoJSON.FeatureCollection,
  boundaryFeature: Feature<Polygon | MultiPolygon>,
  dataConfig: DataConfig,
  options?: {
    progressLabel?: string;
    heartbeatPercentStep?: number;
  },
): Array<Feature<Geometry, GeoJsonProperties>> {
  return filterAndClipRegionsToMask(shapeJSON, boundaryFeature, dataConfig, {
    withinBoundaryCheck: isFullyWithinBoundaryGeometry,
    progressLabel: options?.progressLabel,
    heartbeatPercentStep: options?.heartbeatPercentStep,
  });
}

export function buildRegionsWithoutClipping(
  shapeJSON: GeoJSON.FeatureCollection,
  dataConfig: DataConfig,
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
    );
    feature.id = feature.id;
    results.push(feature);
  }

  return results;
}

function isFullyWithinBoundaryGeometry(
  feature: Feature<Polygon | MultiPolygon>,
  boundaryFeature: Feature<Polygon | MultiPolygon>,
): boolean {
  if (feature.geometry.type === 'Polygon') {
    return turf.booleanWithin(feature, boundaryFeature);
  }

  try {
    for (const coords of feature.geometry.coordinates) {
      const polygonFeature: Feature<Polygon> = turf.polygon(coords);
      if (!turf.booleanWithin(polygonFeature, boundaryFeature)) {
        return false;
      }
    }
  } catch (err) {
    console.warn(
      'Error validating MultiPolygon within boundary geometry for feature:',
      feature.id,
      ' Error:',
      err,
    );
    return turf.booleanContains(
      boundaryFeature,
      turf.bboxPolygon(turf.bbox(feature)),
    );
  }

  return true;
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
    progressLabel?: string;
    heartbeatPercentStep?: number;
  },
): Array<Feature<Geometry, GeoJsonProperties>> {
  const {
    withinBoundaryCheck,
    progressLabel,
    heartbeatPercentStep = 10,
  } = options;

  const results = new Array<Feature<Geometry, GeoJsonProperties>>();
  const unmappedUnitTypeCodes = new Set<string>();
  const boundaryBBox = turf.bbox(boundaryFeature);
  const totalFeatures = shapeJSON.features.length;
  let processedFeatures = 0;

  const logHeartbeat = () => {
    if (!progressLabel || totalFeatures <= 0) {
      return;
    }

    if (processedFeatures === totalFeatures) {
      console.log(
        `[Geometry] ${progressLabel}: ${processedFeatures}/${totalFeatures} (100%)`,
      );
      return;
    }

    const previousPercent = Math.floor(
      ((processedFeatures - 1) * 100) / totalFeatures,
    );
    const currentPercent = Math.floor((processedFeatures * 100) / totalFeatures);

    if (
      processedFeatures === 1 ||
      Math.floor(previousPercent / heartbeatPercentStep) !==
        Math.floor(currentPercent / heartbeatPercentStep)
    ) {
      console.log(
        `[Geometry] ${progressLabel}: ${processedFeatures}/${totalFeatures} (${currentPercent}%)`,
      );
    }
  };

  for (const feature of shapeJSON.features) {
    processedFeatures += 1;
    logHeartbeat();

    if (!isPolygonFeature(feature)) {
      continue;
    }

    const featureBBox = turf.bbox(feature);
    if (!bboxIntersects(boundaryBBox, featureBBox)) {
      continue;
    }

    const fullyWithinBoundary = withinBoundaryCheck(feature, boundaryFeature);
    if (!fullyWithinBoundary && !turf.booleanIntersects(boundaryFeature, feature)) {
      continue;
    }

    let clippedRegion: Feature<Geometry, GeoJsonProperties>;
    if (fullyWithinBoundary) {
      clippedRegion = feature;
    } else {
      const intersection = turf.intersect(
        turf.featureCollection([feature, boundaryFeature]),
      );
      if (!intersection) {
        console.warn('No valid intersection geometry for feature:', feature.id);
        continue;
      }

      const cleanedIntersection = cleanCoords(intersection);
      if (
        !cleanedIntersection ||
        cleanedIntersection.geometry.coordinates.length === 0
      ) {
        // Handle edge case of touching/malformed geometry
        console.warn('No valid intersection geometry for feature:', feature.id);
        continue;
      }

      clippedRegion = cleanedIntersection;
    }

    clippedRegion.properties = buildRegionProperties(
      feature,
      clippedRegion,
      dataConfig,
      fullyWithinBoundary,
      unmappedUnitTypeCodes,
    );
    clippedRegion.id = feature.id;

    results.push(clippedRegion);
  }
  return results;
}

function buildRegionProperties(
  sourceFeature: Feature<Polygon | MultiPolygon>,
  outputFeature: Feature<Geometry, GeoJsonProperties>,
  dataConfig: DataConfig,
  fullyWithinBoundary: boolean,
  unmappedUnitTypeCodes: Set<string>,
): GeoJsonProperties {
  const labelCandidates: LabelCandidate[] = getLabelCandidates(
    fullyWithinBoundary ? sourceFeature : (outputFeature as Feature<Polygon | MultiPolygon>),
  );
  const featureProperties = sourceFeature.properties!;
  const primaryLabel =
    labelCandidates.find((candidate) => candidate.withinPolygon) ||
    labelCandidates[0];

  let regionProperties: GeoJsonProperties = {
    ID: featureProperties[dataConfig.idProperty]!,
    NAME: featureProperties[dataConfig.nameProperty]!,
    DISPLAY_NAME: dataConfig.applicableNameProperties
      ?.map((key) => featureProperties[key])
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0)!,
    LAT: primaryLabel.lat,
    LNG: primaryLabel.lng,
    LABEL_POINTS: {
      primary: { lat: primaryLabel.lat, lng: primaryLabel.lng },
      candidates: labelCandidates,
    },
    WITHIN_BBOX: fullyWithinBoundary,
    AREA_WITHIN_BBOX: turf.area(outputFeature) / 1_000_000,
    TOTAL_AREA: turf.area(sourceFeature) / 1_000_000,
  };

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
