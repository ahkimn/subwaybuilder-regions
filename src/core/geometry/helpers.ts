import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, BBox } from 'geojson';


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
  feature: Feature<Polygon | MultiPolygon>,
  bbox?: BBox,
) {

  if (bbox && (lng < bbox[0] || lat < bbox[1] || lng > bbox[2] || lat > bbox[3])) {
    return false;
  }

  const point = turf.point([lng, lat]);
  return turf.booleanPointInPolygon(point, feature, { ignoreBoundary: false });
}


export function arcLengthInsideBoundary(
  arcCoords: Array<[number, number]>,
  boundary: Feature<Polygon | MultiPolygon>,
): number {
  const arcLine = turf.lineString(arcCoords);
  // This should split the arc into segments that are either fully inside or outside the boundary
  const split = turf.lineSplit(arcLine, boundary);

  let total = 0;

  for (const segment of split.features) {
    const coords = segment.geometry.coordinates;

    // Check if midpoint of segment is within boundary
    const mid = turf.midpoint(
      turf.point(coords[0]),
      turf.point(coords[coords.length - 1])
    );

    if (turf.booleanPointInPolygon(mid, boundary)) {
      total += turf.length(segment, { units: "kilometers" });
    }
  }

  return total;
}
