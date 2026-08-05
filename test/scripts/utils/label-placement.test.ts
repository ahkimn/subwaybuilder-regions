import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePrimaryLabelPoint } from '@scripts/utils/geometry';
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';

function polygon(coords: number[][]): Feature<Polygon> {
  return turf.polygon([coords]);
}

describe('scripts/utils/geometry resolvePrimaryLabelPoint', () => {
  it('uses the area centroid for a convex region', () => {
    const square = polygon([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]);
    const point = resolvePrimaryLabelPoint(square);
    const expected = turf.centerOfMass(square).geometry.coordinates;

    assert.ok(Math.abs(point.lng - expected[0]) < 1e-9);
    assert.ok(Math.abs(point.lat - expected[1]) < 1e-9);
    // ~centre of the unit square
    assert.ok(Math.abs(point.lng - 0.5) < 1e-9);
    assert.ok(Math.abs(point.lat - 0.5) < 1e-9);
  });

  it('falls back to an interior point when the centroid is outside (concave U)', () => {
    // A U opening upward: its area centroid lands in the empty central gap.
    const uShape = polygon([
      [0, 0],
      [3, 0],
      [3, 3],
      [2, 3],
      [2, 1],
      [1, 1],
      [1, 3],
      [0, 3],
      [0, 0],
    ]);

    // Sanity: the centroid is genuinely outside, so the fallback is exercised.
    const centroidOutside = !turf.booleanPointInPolygon(
      turf.centerOfMass(uShape),
      uShape,
    );
    assert.equal(centroidOutside, true);

    const point = resolvePrimaryLabelPoint(uShape);
    const inside = turf.booleanPointInPolygon(
      turf.point([point.lng, point.lat]),
      uShape,
    );
    assert.equal(inside, true);
  });
});
