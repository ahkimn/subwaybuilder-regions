import type { Feature, Polygon, MultiPolygon, Geometry, GeoJsonProperties } from 'geojson';
import * as turf from '@turf/turf';
import { parseNumber } from '../utils/utils';

export type BoundaryBox = {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function isPolygonFeature(
  feature: Feature
): feature is Feature<Polygon | MultiPolygon> {
  return (
    feature.geometry.type === 'Polygon' ||
    feature.geometry.type === 'MultiPolygon'
  );
}

export function isFullyWithinBBox(
  feature: Feature<Polygon | MultiPolygon>,
  bboxPolygon: Feature<Polygon>
): boolean {
  if (feature.geometry.type === 'Polygon') {
    return turf.booleanWithin(feature, bboxPolygon);
  }

  for (const coords of feature.geometry.coordinates) {
    const poly: Feature<Polygon> = turf.polygon(coords);

    if (!turf.booleanWithin(poly, bboxPolygon)) {
      return false;
    }
  }

  return true;
}

export function filterAndClipRegionsToBoundary(
  shapeJSON: GeoJSON.FeatureCollection,
  bbox: BoundaryBox,
  idProperty: string,
  nameProperty: string,
  displayNameProperties?: string[],
  

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

    if (!intersection || intersection.geometry.coordinates.length === 0) {
      // Handle edge case of touching/malformed geometry
      console.warn('No valid intersection geometry for feature:', feature.id);
      continue;
    }

    const fullyWithinBoundary = isFullyWithinBBox(feature, bboxPolygon);
    const clippedRegion = fullyWithinBoundary ? feature : intersection;

    const labelPoint = turf.pointOnFeature(clippedRegion);


    // Input GeoJSON should include properties
    const featureProperties: GeoJsonProperties = feature.properties!;    

    const regionProperties: GeoJsonProperties = {
      ID: featureProperties[idProperty]!,
      NAME: featureProperties[nameProperty]!,
      DISPLAY_NAME:  displayNameProperties
    ?.map((key) => featureProperties[key])
    .find((v): v is string => typeof v === 'string' && v.trim().length > 0)!,
      LAT: labelPoint.geometry.coordinates[1],
      LNG: labelPoint.geometry.coordinates[0],
      WITHIN_BBOX: fullyWithinBoundary,
      AREA_WITHIN_BBOX: turf.area(clippedRegion) / 1_000_000,
      TOTAL_AREA: turf.area(feature) / 1_000_000
    }

    clippedRegion.properties = regionProperties;
    clippedRegion.id = feature.id;

    results.push(clippedRegion);
  }

  return results;
}

export function attachRegionPopulationData(
  features: Array<Feature<Geometry, GeoJsonProperties>>,
  populationIndex: Map<string, string>
): void {
  for (const feature of features) {

    // Name matching is fragile but BUA codes are not consistent between years?
    const featureName = feature.properties!.NAME;
    const featurePopulation = populationIndex.has(featureName) ? parseNumber(populationIndex.get(featureName)!) : null;
    
    if (featurePopulation !== null) {
      feature.properties = {
        ...feature.properties,
        POPULATION: featurePopulation
      }
    } else {
      console.warn('  No population data found for feature:', featureName, ' ID: ', feature.properties!.ID);
    }
    
  }
}