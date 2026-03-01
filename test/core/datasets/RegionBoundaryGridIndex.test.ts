import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RegionBoundaryGridIndex } from '../../../src/core/datasets/RegionBoundaryGridIndex';
import type { BoundaryParams } from '../../../src/core/geometry/arc-length';

function buildBoundaryParams(
  bbox: [number, number, number, number],
): BoundaryParams {
  return {
    bbox,
    polyBBoxes: [bbox],
    projectedPolygons: [],
    baseLatitude: 0,
  };
}

describe('core/datasets/RegionBoundaryGridIndex', () => {
  it('fromBoundaryParamsMap_shouldReturnNull_whenMapIsEmpty', () => {
    const index = RegionBoundaryGridIndex.fromBoundaryParamsMap(
      'test-dataset',
      new Map(),
      2,
      2,
    );

    assert.equal(index, null);
  });

  it('queryByPoint_shouldReturnCandidateIds_whenPointFallsInsideIndexedCell', () => {
    // Given: a grid index with two features in different quadrants.
    const index = RegionBoundaryGridIndex.fromBoundaryParamsMap(
      'test-dataset',
      new Map([
        ['a', buildBoundaryParams([0, 0, 5, 5])],
        ['b', buildBoundaryParams([5, 5, 10, 10])],
      ]),
      2,
      2,
    );

    assert.ok(index);

    // When: querying a point in the lower-left quadrant.
    const candidates = index.queryByPoint(1, 1);

    // Then: candidate set should include feature 'a'.
    assert.equal(candidates.has('a'), true);
  });

  it('queryByBBox_shouldReturnUnionAcrossIntersectedCells_whenBBoxSpansMultipleCells', () => {
    const index = RegionBoundaryGridIndex.fromBoundaryParamsMap(
      'test-dataset',
      new Map([
        ['a', buildBoundaryParams([0, 0, 4, 4])],
        ['b', buildBoundaryParams([6, 6, 10, 10])],
      ]),
      2,
      2,
    );

    assert.ok(index);
    const candidates = index.queryByBBox([0, 0, 10, 10]);
    assert.deepEqual(new Set(candidates), new Set(['a', 'b']));
  });
});
