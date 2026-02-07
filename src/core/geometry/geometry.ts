import type { Feature, Point, Polygon, MultiPolygon, Geometry, GeoJsonProperties } from 'geojson';
import * as turf from '@turf/turf';
import { cleanCoords } from '@turf/clean-coords';
import { parseNumber } from '../../utils/utils';
import { BoundaryBox } from '../types';
import polylabel from 'polylabel';
import { isPolygonFeature, isFullyWithinBBox } from './helpers';

function tryLabelPoint(feature: Feature<Polygon | MultiPolygon>): Feature<Point> {

  const coords = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry.coordinates[0];

  if (coords && coords.length > 0) {
    try {
      return turf.point(polylabel(coords, 1e-6));
    } catch (err) {
      console.warn('\tFailed to compute polylabel for feature:', feature.id, err);
    }
  }

  try {
    return turf.pointOnFeature(feature);
  } catch (err) {
    console.warn('\tFailed to compute pointOnFeature for feature:', feature.id, err);
  }

  try {
    console.warn('\tFalling back to center of mass for label point for feature:', feature.id);
    return turf.centerOfMass(feature);
  } catch (err) {
    console.warn('\tFailed to compute centerOfMass for feature:', feature.id, err);
  }

  try {
    console.warn('\tFalling back to centroid for label point for feature:', feature.id);
    return turf.centroid(feature);
  } catch (err) {
    console.warn('\tFailed to compute centroid for feature:', feature.id, err);
  }

  throw new Error('Unable to determine label point for feature: ' + feature.id);

}

export function filterAndClipRegionsToBoundary(
  shapeJSON: GeoJSON.FeatureCollection,
  bbox: BoundaryBox,
  idProperty: string,
  nameProperty: string,
  displayNameProperties?: string[],
  populationNameProperty?: string

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

    const labelPoint = tryLabelPoint(clippedRegion);


    // Input GeoJSON should include properties
    const featureProperties: GeoJsonProperties = feature.properties!;

    let regionProperties: GeoJsonProperties = {
      ID: featureProperties[idProperty]!,
      NAME: featureProperties[nameProperty]!,
      DISPLAY_NAME: displayNameProperties
        ?.map((key) => featureProperties[key])
        .find((v): v is string => typeof v === 'string' && v.trim().length > 0)!,
      LAT: labelPoint.geometry.coordinates[1],
      LNG: labelPoint.geometry.coordinates[0],
      WITHIN_BBOX: fullyWithinBoundary,
      AREA_WITHIN_BBOX: turf.area(clippedRegion) / 1_000_000,
      TOTAL_AREA: turf.area(feature) / 1_000_000
    }

    if (populationNameProperty && featureProperties[populationNameProperty]) {
      const populationValue = featureProperties[populationNameProperty]!;
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

export function attachRegionPopulationData(
  features: Array<Feature<Geometry, GeoJsonProperties>>,
  populationIndex: Map<string, string>,
  idProperty: string
): void {
  for (const feature of features) {

    if (feature.properties!.POPULATION != null) {
      continue; // Skip if population already set
    }

    // Name matching is fragile but BUA codes are not consistent between years?
    const featureCode = feature.properties![idProperty];
    const featurePopulation = populationIndex.has(featureCode) ? parseNumber(populationIndex.get(featureCode)!) : null;

    if (featurePopulation !== null) {
      feature.properties = {
        ...feature.properties,
        POPULATION: featurePopulation
      }
    } else {
      console.warn('  No population data found for feature:', feature.properties!.NAME, ' ID: ', featureCode);
    }
  }
}