import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildBoundaryEdgeIndex,
  isDefinitelyWithinOrOutside,
} from '@lib/geometry/helpers';
import * as turf from '@turf/turf';
import type { BBox, Feature, Polygon } from 'geojson';

// Square [0,10]^2 with a square hole [4,6]^2.
const boundary = turf.polygon([
  [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ],
  [
    [4, 4],
    [4, 6],
    [6, 6],
    [6, 4],
    [4, 4],
  ],
]);

const index = buildBoundaryEdgeIndex(boundary);

function box(x0: number, y0: number, x1: number, y1: number): Feature<Polygon> {
  return turf.polygon([
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
      [x0, y0],
    ],
  ]);
}

function decide(f: Feature<Polygon>): boolean | null {
  return isDefinitelyWithinOrOutside(f, index, turf.bbox(f) as BBox);
}

describe('lib/geometry boundary edge index fast-path', () => {
  it('classifies a feature clear of every edge and inside as within', () => {
    assert.equal(decide(box(1, 1, 3, 3)), true);
  });

  it('classifies a feature clear of every edge but inside the hole as outside', () => {
    assert.equal(decide(box(4.5, 4.5, 5.5, 5.5)), false);
  });

  it('defers (null) when the feature straddles the outer boundary edge', () => {
    assert.equal(decide(box(9, 4, 11, 6)), null); // bbox extends beyond boundary bbox
  });

  it('defers (null) when a boundary (hole) edge falls inside the feature bbox', () => {
    assert.equal(decide(box(3, 4.5, 5, 5.5)), null); // hole edge x=4 is inside
  });
});
