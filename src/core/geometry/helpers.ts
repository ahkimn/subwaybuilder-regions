import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon } from 'geojson';


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
  try {
    for (const coords of feature.geometry.coordinates) {
      const poly: Feature<Polygon> = turf.polygon(coords);

      if (!turf.booleanWithin(poly, bboxPolygon)) {
        return false;
      }
    }
  } catch (err) {
    console.warn('Error validating MultiPolygon within bbox for feature:', feature.id, ' Error:', err);
    // Fallback check for complex/malformed MultiPolygon geometries
    return turf.booleanContains(bboxPolygon, turf.bboxPolygon(turf.bbox(feature)));
  }

  return true;
}

export function isCoordinateWithinFeature(
  lat: number,
  lng: number,
  feature: Feature<Polygon | MultiPolygon>
) {
  const point = turf.point([lng, lat]);
  return turf.booleanPointInPolygon(point, feature, { ignoreBoundary: true });
}
