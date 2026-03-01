import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RingCoordinate } from '@/core/geometry/helpers';
import {
  bboxIntersects,
  isCoordinateOutsideBBox,
  pointInMultiPolygon,
  projectCoordinate,
  segmentLength,
} from '@/core/geometry/helpers';

describe('core/geometry/helpers', () => {
  it('bboxIntersects_shouldReturnTrue_whenBBoxesTouchAtEdge', () => {
    assert.equal(bboxIntersects([0, 0, 1, 1], [1, 0, 2, 1]), true);
  });

  it('bboxIntersects_shouldReturnFalse_whenBBoxesAreDisjoint', () => {
    assert.equal(bboxIntersects([0, 0, 1, 1], [2, 2, 3, 3]), false);
  });

  it('isCoordinateOutsideBBox_shouldRespectInclusiveBoundaries_whenPointLiesOnEdge', () => {
    assert.equal(isCoordinateOutsideBBox(1, 1, [0, 0, 1, 1]), false);
  });

  it('segmentLength_shouldReturnEuclideanDistance_whenCoordinatesDiffer', () => {
    assert.equal(segmentLength([0, 0], [3, 4]), 5);
  });

  it('projectCoordinate_shouldProjectToMeters_whenBaseLatitudeIsZero', () => {
    const [x, y] = projectCoordinate([1, 1], 0);
    assert.equal(Number.isFinite(x), true);
    assert.equal(Number.isFinite(y), true);
    assert.equal(Math.abs(x - y) < 1, true);
  });

  it('pointInMultiPolygon_shouldReturnFalse_whenPointIsInsideHole', () => {
    const polygonWithHole: RingCoordinate[] = [
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ],
      [
        [1, 1],
        [3, 1],
        [3, 3],
        [1, 3],
        [1, 1],
      ],
    ];

    assert.equal(pointInMultiPolygon([2, 2], [polygonWithHole]), false);
  });
});
