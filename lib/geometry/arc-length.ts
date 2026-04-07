import * as turf from '@turf/turf';
import type { BBox, Feature, MultiPolygon, Polygon } from 'geojson';

import type { Coordinate, PolygonCoordinates } from './helpers';
import {
  bboxIntersects,
  interpolatePoint,
  multiPolyBBox,
  pointInMultiPolygon,
  polygonBBox,
  projectCoordinate,
  projectPolygon,
  segmentBBox,
  segmentLength,
  segmentMidpoint,
  segmentPolygonIntersections,
  toPolyCoordinates,
} from './helpers';

export type BoundaryParams = {
  bbox: BBox;
  polyBBoxes: BBox[];
  projectedPolygons: PolygonCoordinates[];
  baseLatitude: number;
};

export function prepareBoundaryParams(
  feature: Feature<Polygon | MultiPolygon>,
): BoundaryParams {
  const polyCoordinates =
    feature.geometry.type === 'Polygon'
      ? [toPolyCoordinates(feature.geometry.coordinates)]
      : feature.geometry.coordinates.map((poly) => toPolyCoordinates(poly));

  const polyBBoxes = polyCoordinates.map(polygonBBox);
  const bbox = multiPolyBBox(polyBBoxes);

  const [, minLat, , maxLat] = bbox;
  const baseLatitude = (minLat + maxLat) * 0.5;

  const projectedPolygons = polyCoordinates.map((poly) =>
    projectPolygon(poly, baseLatitude),
  );

  return {
    bbox,
    polyBBoxes,
    projectedPolygons,
    baseLatitude,
  };
}

// Approximate arc length within boundary assuming planar geometry (faster)
export function planarArcLengthInsideBoundary(
  arcCoords: Array<Coordinate>,
  knownLength: number | undefined,
  boundaryParams: BoundaryParams,
): number {
  let intersectLength = 0;
  let totalPlanarLength = 0;
  if (arcCoords.length < 2) return intersectLength;

  // Unprojected coordinates for bbox checks
  const polyBBoxes = boundaryParams.polyBBoxes;
  const bbox: BBox = boundaryParams.bbox;

  const projectedArc = arcCoords.map((p) =>
    projectCoordinate(p, boundaryParams.baseLatitude),
  );
  const projectedPolygons = boundaryParams.projectedPolygons;

  for (let i = 1; i < projectedArc.length; i++) {
    const a = projectedArc[i - 1];
    const b = projectedArc[i];

    const segBBox = segmentBBox(arcCoords[i - 1], arcCoords[i]);

    // Ignore segments without bbox intersection (using unprojected coordinates)
    if (bboxIntersects(segBBox, bbox) === false) continue;

    // Track ratio of intersecting length to total length
    const segPlanarLength = segmentLength(a, b);
    totalPlanarLength += segPlanarLength;

    const ts = [0, 1];

    // Find intersecting fragments of the segment, filtering by bbox first
    for (const [idx, rings] of projectedPolygons.entries()) {
      const polyBBox = polyBBoxes[idx];
      if (!bboxIntersects(segBBox, polyBBox)) continue;
      ts.push(...segmentPolygonIntersections(a, b, rings));
    }

    ts.sort((x, y) => x - y);

    // Iterate over intersecting fragments, using midpoint to check if fragment is within boundary
    for (let k = 1; k < ts.length; k++) {
      const t0 = ts[k - 1];
      const t1 = ts[k];
      // Ignore very small segments (should not happen due to lower bound on track segment length)
      if (t1 - t0 < 1e-9) continue;

      const mid: Coordinate = segmentMidpoint(a, b, t0, t1);

      if (pointInMultiPolygon(mid, projectedPolygons)) {
        const p0: Coordinate = interpolatePoint(a, b, t0);
        const p1: Coordinate = interpolatePoint(a, b, t1);

        intersectLength += segmentLength(p0, p1);
      }
    }
  }
  // Return planar length (km) if there is no intersection or if geodesic length is unknown
  if (!knownLength || totalPlanarLength === 0) {
    return intersectLength / 1000;
  }

  // Otherwise, scale the known length by the ratio of intersecting length to total length
  return (knownLength * (intersectLength / totalPlanarLength)) / 1000;
}

// Accurate geodesic calculation of arc length within boundary (computationally expensive)
export function geodesicArcLengthInsideBoundary(
  arcCoords: Array<Coordinate>,
  boundary: Feature<Polygon | MultiPolygon>,
  boundaryBBox: BBox,
  knownLength: number | undefined,
): number {
  let intersectLength = 0;
  if (arcCoords.length < 2) return intersectLength;

  const lineString = turf.lineString(arcCoords);
  const arcBBox = turf.bbox(lineString);

  // Reject if no bbox intersection
  if (!bboxIntersects(arcBBox, boundaryBBox)) return intersectLength;

  // Reject if no geometry intersection
  if (!turf.booleanIntersects(lineString, boundary)) return intersectLength;

  // If the arc is fully within the boundary, return its full length (using known length if available, otherwise calculate)
  if (turf.booleanWithin(lineString, boundary)) {
    return knownLength !== undefined
      ? knownLength / 1000
      : turf.length(lineString, { units: 'kilometers' });
  }

  // Split the arc into segments that are either fully inside or outside the boundary (most expensive computation)
  const split = turf.lineSplit(lineString, boundary);

  for (const segment of split.features) {
    const coords = segment.geometry.coordinates;

    // Check if midpoint of segment is within boundary
    const mid = turf.midpoint(
      turf.point(coords[0]),
      turf.point(coords[coords.length - 1]),
    );

    if (turf.booleanPointInPolygon(mid, boundary)) {
      intersectLength += turf.length(segment, { units: 'kilometers' });
    }
  }

  return intersectLength;
}
