import type { Feature, Point, Polygon, MultiPolygon, Geometry, GeoJsonProperties } from 'geojson';
import * as turf from '@turf/turf';
import { cleanCoords } from '@turf/clean-coords';
import polylabel from 'polylabel';
import { isPolygonFeature, isFullyWithinBBox } from '../../src/core/geometry/helpers';
import { DataConfig } from '../extract/handler-types';
import { parseNumber } from './cli';

// --- Basic Geometry & Helpers --- //
export type BoundaryBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export function isFeatureCollection(
  geoJson: GeoJSON.GeoJSON
): geoJson is GeoJSON.FeatureCollection {
  return geoJson.type === 'FeatureCollection';
}

export function bboxToGeometryString(bbox: BoundaryBox): string {
  return `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
}

export function expandBbox(bbox: BoundaryBox, paddingDegrees: number): BoundaryBox {
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
}

function getLargestPolygon(
  feature: Feature<MultiPolygon>
): Polygon {

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

function getLabelCandidates(feature: Feature<Polygon | MultiPolygon>): LabelCandidate[] {

  const candidates: Array<{ method: string, point: Feature<Point> }> = [];

  const coords = feature.geometry.type === 'Polygon' ?
    feature.geometry.coordinates :
    getLargestPolygon(feature as Feature<MultiPolygon>).coordinates;

  if (!coords || coords.length === 0) {
    throw new Error('Feature has no valid coordinates');
  }

  try {
    candidates.push({
      method: 'polylabel',
      point: turf.point(polylabel(coords, 1e-6))
    })
  } catch (err) {
    console.warn('\tFailed to compute polylabel for feature:', feature.id, err);
  }

  try {
    candidates.push({
      method: 'pointOnFeature',
      point: turf.pointOnFeature(feature)
    })
  } catch (err) {
    console.warn('\tFailed to compute pointOnFeature for feature:', feature.id, err);
  }

  try {
    candidates.push({
      method: 'centerOfMass',
      point: turf.centerOfMass(feature)
    })
  } catch (err) {
    console.warn('\tFailed to compute centerOfMass for feature:', feature.id, err);
  }

  try {
    candidates.push({
      method: 'centroid',
      point: turf.centroid(feature)
    })
  } catch (err) {
    console.warn('\tFailed to compute centroid for feature:', feature.id, err);
  }


  if (candidates.length === 0) {
    throw new Error('Unable to determine label point for feature: ' + feature.id);
  }

  return candidates.map(({ method, point }) => ({
    method: method,
    lat: point.geometry.coordinates[1],
    lng: point.geometry.coordinates[0],
    withinPolygon: turf.booleanPointInPolygon(point, feature)
  }));
}

// --- Boundary Filtering and Clipping --- //

export function filterAndClipRegionsToBoundary(
  shapeJSON: GeoJSON.FeatureCollection,
  bbox: BoundaryBox,
  dataConfig: DataConfig
): Array<Feature<Geometry, GeoJsonProperties>> {

  const bboxPolygon = turf.bboxPolygon([
    bbox.west,
    bbox.south,
    bbox.east,
    bbox.north,
  ])

  const results = new Array<Feature<Geometry, GeoJsonProperties>>();

  for (const feature of shapeJSON.features) {
    if (!isPolygonFeature(feature)) {
      continue;
    }
    if (!turf.booleanIntersects(
      bboxPolygon,
      feature
    )) {
      continue;
    }

    const intersection = turf.intersect(
      turf.featureCollection([feature, bboxPolygon])
    );
    const cleanedIntersection = cleanCoords(intersection);

    if (!cleanedIntersection || cleanedIntersection.geometry.coordinates.length === 0) {
      // Handle edge case of touching/malformed geometry
      console.warn('No valid intersection geometry for feature:', feature.id);
      continue;
    }

    const fullyWithinBoundary = isFullyWithinBBox(feature, bboxPolygon);
    const clippedRegion = fullyWithinBoundary ? feature : cleanedIntersection;

    // Try label with the original (unclipped) geometry if it is fully within the boundary
    const labelCandidates: LabelCandidate[] = getLabelCandidates(fullyWithinBoundary ? feature : clippedRegion);

    // Input GeoJSON should include properties
    const featureProperties: GeoJsonProperties = feature.properties!;

    // Find first label candidate that is within the polygon, otherwise default to the first candidate
    const primaryLabel = labelCandidates.find(c => c.withinPolygon) || labelCandidates[0];

    let regionProperties: GeoJsonProperties = {
      ID: featureProperties[dataConfig.idProperty]!,
      NAME: featureProperties[dataConfig.nameProperty]!,
      DISPLAY_NAME: dataConfig.applicableNameProperties
        ?.map((key) => featureProperties[key])
        .find((v): v is string => typeof v === 'string' && v.trim().length > 0)!,
      LAT: primaryLabel.lat,
      LNG: primaryLabel.lng,
      LABEL_POINTS: {
        primary: { lat: primaryLabel.lat, lng: primaryLabel.lng },
        candidates: labelCandidates
      },
      WITHIN_BBOX: fullyWithinBoundary,
      AREA_WITHIN_BBOX: turf.area(clippedRegion) / 1_000_000,
      TOTAL_AREA: turf.area(feature) / 1_000_000
    }

    if (dataConfig.populationProperty && featureProperties[dataConfig.populationProperty]) {
      const populationValue = featureProperties[dataConfig.populationProperty]!;
      regionProperties = {
        ...regionProperties,
        POPULATION: parseNumber(populationValue)
      }
    };

    clippedRegion.properties = regionProperties;
    clippedRegion.id = feature.id;

    results.push(clippedRegion);
  }
  return results;
}
