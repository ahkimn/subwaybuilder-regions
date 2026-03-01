import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RingCoordinate } from '@/core/geometry/helpers';
import {
  buildBBoxFitState,
  buildPaddedBBoxForDemandData,
  bboxIntersects,
  computeDemandDataBBox,
  getArcBBox,
  isCoordinateOutsideBBox,
  isValidCoordinate,
  interpolatePoint,
  multiPolyBBox,
  normalizeBBox,
  padBBoxKm,
  pointInMultiPolygon,
  polygonBBox,
  projectCoordinate,
  segmentBBox,
  segmentMidpoint,
  segmentPolygonIntersections,
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

  it('normalizeBBox_shouldHandleNoopAndSymmetricExpansion', () => {
    const cases = [
      {
        name: 'no-op when bbox already exceeds min spans',
        bbox: [0, 0, 10, 6] as [number, number, number, number],
        minLngSpan: 4,
        minLatSpan: 4,
        expected: [0, 0, 10, 6],
      },
      {
        name: 'symmetric expansion when spans are below thresholds',
        bbox: [2, 2, 3, 3] as [number, number, number, number],
        minLngSpan: 5,
        minLatSpan: 7,
        expected: [0, -1, 5, 6],
      },
    ];

    for (const testCase of cases) {
      assert.deepEqual(
        normalizeBBox(testCase.bbox, testCase.minLngSpan, testCase.minLatSpan),
        testCase.expected,
        testCase.name,
      );
    }
  });

  it('buildBBoxFitState_shouldClampPerSidePaddingBetweenMinAndMax', () => {
    const cases = [
      {
        name: 'clamps to minimum when coverage is near 1',
        args: [[0, 0, 1, 1] as [number, number, number, number], 1000, 600, 0.99, 24, 200] as const,
        expectedPadding: 24,
      },
      {
        name: 'clamps to maximum when base padding exceeds max',
        args: [[0, 0, 1, 1] as [number, number, number, number], 1200, 800, 0.2, 24, 100] as const,
        expectedPadding: 100,
      },
    ];

    for (const testCase of cases) {
      const result = buildBBoxFitState(...testCase.args);
      assert.deepEqual(result.bbox, [0, 0, 1, 1], testCase.name);
      assert.deepEqual(
        result.padding,
        {
          top: testCase.expectedPadding,
          right: testCase.expectedPadding,
          bottom: testCase.expectedPadding,
          left: testCase.expectedPadding,
        },
        testCase.name,
      );
    }
  });

  it('segmentBBox_and_getArcBBox_shouldHandleReversedAndDegenerateInputs', () => {
    assert.deepEqual(segmentBBox([5, 4], [1, -2]), [1, -2, 5, 4]);

    const arcCases = [
      {
        name: 'reversed coordinates',
        coords: [
          [3, 4],
          [2, 2],
          [-1, 5],
        ] as [number, number][],
        expected: [-1, 2, 3, 5],
      },
      {
        name: 'singleton arc',
        coords: [[7, -3]] as [number, number][],
        expected: [7, -3, 7, -3],
      },
      {
        name: 'empty arc defaults to zeros',
        coords: [] as [number, number][],
        expected: [0, 0, 0, 0],
      },
    ];

    for (const testCase of arcCases) {
      assert.deepEqual(getArcBBox(testCase.coords), testCase.expected, testCase.name);
    }
  });

  it('isValidCoordinate_shouldRespectBoundariesAndRejectNonFiniteValues', () => {
    const cases = [
      { name: 'inclusive minimum bounds', lng: -180, lat: -90, expected: true },
      { name: 'inclusive maximum bounds', lng: 180, lat: 90, expected: true },
      { name: 'non-finite longitude', lng: Number.NaN, lat: 0, expected: false },
      { name: 'non-finite latitude', lng: 0, lat: Number.POSITIVE_INFINITY, expected: false },
      { name: 'out of range longitude', lng: 181, lat: 0, expected: false },
      { name: 'out of range latitude', lng: 0, lat: -91, expected: false },
    ];

    for (const testCase of cases) {
      assert.equal(
        isValidCoordinate(testCase.lng, testCase.lat),
        testCase.expected,
        testCase.name,
      );
    }
  });

  it('polygonBBox_and_multiPolyBBox_shouldIgnoreNonFiniteAndHandleEmptyPolygons', () => {
    const polygonWithInvalidValues: RingCoordinate[] = [
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
      [
        [Number.NaN, 1],
        [1, Number.POSITIVE_INFINITY],
      ],
    ];

    const validBBox = polygonBBox(polygonWithInvalidValues);
    assert.deepEqual(validBBox, [0, 0, 2, 2]);

    const invalidPolygonBBox = polygonBBox([]);
    assert.deepEqual(invalidPolygonBBox, [Infinity, Infinity, -Infinity, -Infinity]);

    assert.deepEqual(multiPolyBBox([validBBox, [5, 5, 6, 6]]), [0, 0, 6, 6]);
    assert.deepEqual(
      multiPolyBBox([[Infinity, Infinity, -Infinity, -Infinity]]),
      [Infinity, Infinity, -Infinity, -Infinity],
    );
  });

  it('computeDemandDataBBox_and_buildPaddedBBoxForDemandData_shouldHandleMixedAndInvalidPoints', () => {
    const mixedDemandData = {
      points: [
        {
          id: 'a',
          location: [-122.5, 37.7],
          jobs: 1,
          residents: 2,
          popIds: [],
        },
        {
          id: 'b',
          location: [181, 0],
          jobs: 1,
          residents: 2,
          popIds: [],
        },
        {
          id: 'c',
          location: [-122.4, 37.8],
          jobs: 3,
          residents: 4,
          popIds: [],
        },
      ],
      pops: [],
    };

    assert.deepEqual(computeDemandDataBBox(mixedDemandData), [-122.5, 37.7, -122.4, 37.8]);

    const padded = buildPaddedBBoxForDemandData(mixedDemandData, 1);
    assert.equal(padded !== null, true);
    if (padded) {
      assert.equal(padded[0] < -122.5, true);
      assert.equal(padded[1] < 37.7, true);
      assert.equal(padded[2] > -122.4, true);
      assert.equal(padded[3] > 37.8, true);
    }

    const invalidDemandData = {
      points: [
        {
          id: 'x',
          location: [200, 95],
          jobs: 1,
          residents: 1,
          popIds: [],
        },
      ],
      pops: [],
    };
    assert.equal(computeDemandDataBBox(invalidDemandData), null);
    assert.equal(buildPaddedBBoxForDemandData(invalidDemandData, 1), null);
  });

  it('padBBoxKm_shouldClampNegativePaddingAndWorldBounds', () => {
    const bbox: [number, number, number, number] = [-10, -10, 10, 10];
    assert.deepEqual(padBBoxKm(bbox, -2), bbox);

    const nearWorldEdge: [number, number, number, number] = [179.9, 89.99, 180, 89.999];
    const padded = padBBoxKm(nearWorldEdge, 500);
    assert.equal(padded[0] >= -180, true);
    assert.equal(padded[1] >= -89.999, true);
    assert.equal(padded[2], 180);
    assert.equal(padded[3], 89.999);
  });

  it('segmentPolygonIntersections_interpolatePoint_segmentMidpoint_shouldHandleCrossingsAndRatios', () => {
    const square: RingCoordinate = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ];

    assert.deepEqual(
      segmentPolygonIntersections([-1, 1], [3, 1], [square]).sort((a, b) => a - b),
      [0.25, 0.75],
    );
    assert.deepEqual(segmentPolygonIntersections([-1, -1], [-2, -2], [square]), []);

    assert.deepEqual(interpolatePoint([0, 0], [4, 8], 0), [0, 0]);
    assert.deepEqual(interpolatePoint([0, 0], [4, 8], 0.5), [2, 4]);
    assert.deepEqual(interpolatePoint([0, 0], [4, 8], 1), [4, 8]);
    assert.deepEqual(segmentMidpoint([0, 0], [4, 8], 0.25, 0.75), [2, 4]);
  });
});
