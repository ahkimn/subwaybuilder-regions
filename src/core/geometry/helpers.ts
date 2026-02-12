import * as turf from '@turf/turf';
import type { BBox, Feature, MultiPolygon, Polygon, Position } from 'geojson';

export type Coordinate = [number, number]; // [lng, lat]
export type RingCoordinate = Coordinate[]; // Closed loop of coordinates
export type PolygonCoordinates = RingCoordinate[]; // First ring is outer boundary, subsequent rings are holes

const R_E = 6371008.8; // Earth's radius in meters
const DEG = Math.PI / 180; // Convert geographic degrees to radians

function toCoordinate(p: Position): Coordinate {
  return [p[0], p[1]];
}

export function toPolyCoordinates(p: Position[][]): PolygonCoordinates {
  return p.map((ring) => ring.map(toCoordinate));
}

export function isPolygonFeature(
  feature: Feature,
): feature is Feature<Polygon | MultiPolygon> {
  return (
    feature.geometry.type === 'Polygon' ||
    feature.geometry.type === 'MultiPolygon'
  );
}

export function isFullyWithinBBox(
  feature: Feature<Polygon | MultiPolygon>,
  bboxPolygon: Feature<Polygon>,
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
    console.warn(
      'Error validating MultiPolygon within bbox for feature:',
      feature.id,
      ' Error:',
      err,
    );
    // Fallback check for complex/malformed MultiPolygon geometries
    return turf.booleanContains(
      bboxPolygon,
      turf.bboxPolygon(turf.bbox(feature)),
    );
  }

  return true;
}

export function isCoordinateWithinFeature(
  lat: number,
  lng: number,
  feature: Feature<Polygon | MultiPolygon>,
  bbox?: BBox,
) {
  if (
    bbox &&
    (lng < bbox[0] || lat < bbox[1] || lng > bbox[2] || lat > bbox[3])
  ) {
    return false;
  }

  const point = turf.point([lng, lat]);
  return turf.booleanPointInPolygon(point, feature, { ignoreBoundary: false });
}

// BBox is [west, south, east, north] => [minLng, minLat, maxLng, maxLat]
export function bboxIntersects(a: BBox, b: BBox): boolean {
  return !(
    a[2] < b[0] || // a.maxX < b.minX
    a[0] > b[2] || // a.minX > b.maxX
    a[3] < b[1] || // a.maxY < b.minY
    a[1] > b[3] // a.minY > b.maxY
  );
}

// Get bounding box for a line segment defined by two coordinates
export function segmentBBox(a: Coordinate, b: Coordinate): BBox {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[0], b[0]),
    Math.max(a[1], b[1]),
  ];
}

export function polygonBBox(polygon: PolygonCoordinates): BBox {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const ring of polygon) {
    for (const [lng, lat] of ring) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  }
  return [minLng, minLat, maxLng, maxLat];
}

export function multiPolyBBox(bboxes: BBox[]): BBox {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const bbox of bboxes) {
    minLng = Math.min(minLng, bbox[0]);
    minLat = Math.min(minLat, bbox[1]);
    maxLng = Math.max(maxLng, bbox[2]);
    maxLat = Math.max(maxLat, bbox[3]);
  }
  return [minLng, minLat, maxLng, maxLat];
}

// Project geographic coordinate to meter-based coordinate using a base latitude for scaling (equirectangular approximation)
export function projectCoordinate(
  [lng, lat]: Coordinate,
  baseLatitude: number, // Latitude at which to project
): Coordinate {
  return [R_E * lng * DEG * Math.cos(baseLatitude * DEG), R_E * lat * DEG];
}

export function projectPolygon(
  polygon: PolygonCoordinates,
  baseLatitude: number,
): PolygonCoordinates {
  return polygon.map((ring) =>
    ring.map((coord) => projectCoordinate(coord, baseLatitude)),
  );
}

function pointInRing(point: Coordinate, ring: RingCoordinate): boolean {
  let insidePolygon = false;
  const [x, y] = point;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) insidePolygon = !insidePolygon;
  }

  return insidePolygon;
}

function pointInPolygon(point: Coordinate, rings: RingCoordinate[]): boolean {
  // In GeoJSON, the first ring is the outer boundary of the polygon
  if (!pointInRing(point, rings[0])) return false;

  // Any subsequent rings are holes, so we must verify that the point is not within any of them
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(point, rings[i])) return false;
  }

  return true;
}

export function pointInMultiPolygon(
  point: Coordinate,
  polygons: RingCoordinate[][],
): boolean {
  for (const polygon of polygons) {
    if (pointInPolygon(point, polygon)) {
      return true;
    }
  }
  return false;
}

function segmentIntersectionT(
  a: Coordinate,
  b: Coordinate,
  c: Coordinate,
  d: Coordinate,
): number | null {
  const r = [b[0] - a[0], b[1] - a[1]]; // Direction vector of segment AB
  const s = [d[0] - c[0], d[1] - c[1]]; // Direction vector of segment CD

  const denom = r[0] * s[1] - r[1] * s[0]; // Cross product of r and s
  if (denom === 0) return null; // parallel

  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / denom; // Relative position on CD
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / denom; // Relative position on AB

  // Validate interersection is within both segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return t;
  }

  return null;
}

export function segmentPolygonIntersections(
  a: Coordinate,
  b: Coordinate,
  polygons: RingCoordinate[],
): number[] {
  const ts: number[] = [];

  for (const polygon of polygons) {
    for (let i = 0; i < polygon.length - 1; i++) {
      const t = segmentIntersectionT(a, b, polygon[i], polygon[i + 1]);
      if (t !== null) ts.push(t);
    }
  }

  return ts;
}

export function segmentLength(a: Coordinate, b: Coordinate): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

// Linear interpolation between two coordinates
export function interpolatePoint(
  a: Coordinate,
  b: Coordinate,
  t: number,
): Coordinate {
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

export function segmentMidpoint(
  a: Coordinate,
  b: Coordinate,
  t0: number,
  t1: number,
): Coordinate {
  const t = (t0 + t1) * 0.5;
  return interpolatePoint(a, b, t);
}
