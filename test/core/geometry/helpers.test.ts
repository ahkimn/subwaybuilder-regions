import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RingCoordinate } from '../../../src/core/geometry/helpers';
import {
  bboxIntersects,
  buildBBoxFitState,
  getArcBBox,
  isCoordinateOutsideBBox,
  isValidCoordinate,
  normalizeBBox,
  pointInMultiPolygon,
  projectCoordinate,
  segmentBBox,
  segmentLength,
} from '../../../src/core/geometry/helpers';

describe('core/geometry/helpers', () => {
  const bboxIntersectionCases: Array<{
    name: string;
    a: [number, number, number, number];
    b: [number, number, number, number];
    expected: boolean;
  }> = [
    {
      name: 'bboxIntersects_shouldReturnTrue_whenBBoxesTouchAtEdge',
      a: [0, 0, 1, 1],
      b: [1, 0, 2, 1],
      expected: true,
    },
    {
      name: 'bboxIntersects_shouldReturnFalse_whenBBoxesAreDisjoint',
      a: [0, 0, 1, 1],
      b: [2, 2, 3, 3],
      expected: false,
    },
  ];

  for (const testCase of bboxIntersectionCases) {
    it(testCase.name, () => {
      assert.equal(bboxIntersects(testCase.a, testCase.b), testCase.expected);
    });
  }

  it('normalizeBBox_shouldExpandSymmetrically_whenMinimumSpanIsLargerThanBBox', () => {
    const normalized = normalizeBBox([0, 0, 1, 1], 4, 6);
    assert.deepEqual(normalized, [-1.5, -2.5, 2.5, 3.5]);
  });

  it('buildBBoxFitState_shouldClampPaddingToBounds_whenCoveragePaddingExceedsLimits', () => {
    const fit = buildBBoxFitState([0, 0, 1, 1], 200, 100, 0.1, 5, 20);
    assert.equal(fit.padding.top, 20);
    assert.equal(fit.padding.right, 20);
    assert.equal(fit.padding.bottom, 20);
    assert.equal(fit.padding.left, 20);
  });

  it('segmentBBox_shouldReturnExpectedBounds_whenCoordinatesProvided', () => {
    assert.deepEqual(segmentBBox([3, -1], [-2, 4]), [-2, -1, 3, 4]);
  });

  it('getArcBBox_shouldReturnSinglePointBBox_whenOnlyOneCoordinateProvided', () => {
    assert.deepEqual(getArcBBox([[10, 20]]), [10, 20, 10, 20]);
  });

  it('isValidCoordinate_shouldRejectOutOfRange_whenLngOrLatExceedsBounds', () => {
    assert.equal(isValidCoordinate(181, 0), false);
    assert.equal(isValidCoordinate(0, -91), false);
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
    // Given: a polygon with an inner hole ring.
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

    // When: evaluating a point that is inside the inner hole.
    // Then: result should be false because holes are excluded from polygon interior.
    assert.equal(pointInMultiPolygon([2, 2], [polygonWithHole]), false);
  });
});
