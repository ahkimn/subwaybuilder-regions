import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as turf from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

import {
  geodesicArcLengthInsideBoundary,
  planarArcLengthInsideBoundary,
  prepareBoundaryParams,
} from '@/core/geometry/arc-length';

const squarePolygon: Feature<Polygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  },
};

const squareMultiPolygon: Feature<MultiPolygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
      [
        [
          [2, 2],
          [3, 2],
          [3, 3],
          [2, 3],
          [2, 2],
        ],
      ],
    ],
  },
};

function assertNear(actual: number, expected: number, tolerance = 1e-6): void {
  assert.equal(Math.abs(actual - expected) <= tolerance, true);
}

describe('core/geometry/arc-length', () => {
  describe('prepareBoundaryParams', () => {
    it('polygonInput_shouldCreateProjectedPolygonAndExpectedMetadata', () => {
      const params = prepareBoundaryParams(squarePolygon);

      assert.deepEqual(params.bbox, [0, 0, 1, 1]);
      assert.equal(params.projectedPolygons.length, 1);
      assert.equal(params.polyBBoxes.length, 1);
      assert.deepEqual(params.polyBBoxes[0], [0, 0, 1, 1]);
      assertNear(params.baseLatitude, 0.5, 1e-12);
    });

    it('multipolygonInput_shouldMergeBBoxesAndRetainPolygonCount', () => {
      const params = prepareBoundaryParams(squareMultiPolygon);

      assert.deepEqual(params.bbox, [0, 0, 3, 3]);
      assert.equal(params.polyBBoxes.length, 2);
      assert.equal(params.projectedPolygons.length, 2);
      assertNear(params.baseLatitude, 1.5, 1e-12);
    });
  });

  describe('planarArcLengthInsideBoundary', () => {
    it('shouldReturnZero_whenArcHasFewerThanTwoPoints', () => {
      const boundaryParams = prepareBoundaryParams(squarePolygon);

      const length = planarArcLengthInsideBoundary([[0.2, 0.2]], undefined, boundaryParams);

      assert.equal(length, 0);
    });

    it('shouldReturnZero_whenArcBBoxDoesNotIntersectBoundaryBBox', () => {
      const boundaryParams = prepareBoundaryParams(squarePolygon);

      const length = planarArcLengthInsideBoundary(
        [
          [10, 10],
          [11, 10],
        ],
        undefined,
        boundaryParams,
      );

      assert.equal(length, 0);
    });

    it('shouldReturnPositiveLength_whenSegmentPartiallyIntersectsBoundary', () => {
      const boundaryParams = prepareBoundaryParams(squarePolygon);

      const lengthKm = planarArcLengthInsideBoundary(
        [
          [-0.5, 0.5],
          [0.5, 0.5],
        ],
        undefined,
        boundaryParams,
      );

      assert.equal(lengthKm > 0, true);
    });

    it('shouldScaleByKnownLength_whenKnownLengthIsProvided', () => {
      const boundaryParams = prepareBoundaryParams(squarePolygon);
      const knownLengthMeters = 10_000;

      const lengthKm = planarArcLengthInsideBoundary(
        [
          [-0.5, 0.5],
          [0.5, 0.5],
        ],
        knownLengthMeters,
        boundaryParams,
      );

      assertNear(lengthKm, 5, 1e-6);
    });
  });

  describe('geodesicArcLengthInsideBoundary', () => {
    it('shouldReturnZero_whenArcBBoxDoesNotIntersectBoundaryBBox', () => {
      const lengthKm = geodesicArcLengthInsideBoundary(
        [
          [10, 10],
          [11, 10],
        ],
        squarePolygon,
        [0, 0, 1, 1],
        undefined,
      );

      assert.equal(lengthKm, 0);
    });

    it('shouldReturnFullKnownLength_whenLineIsFullyWithinBoundary', () => {
      const knownLengthMeters = 1_234;

      const lengthKm = geodesicArcLengthInsideBoundary(
        [
          [0.2, 0.2],
          [0.8, 0.8],
        ],
        squarePolygon,
        [0, 0, 1, 1],
        knownLengthMeters,
      );

      assertNear(lengthKm, 1.234, 1e-12);
    });

    it('shouldReturnPartialPositiveLength_whenLineCrossesBoundary', () => {
      const arcCoords: Array<[number, number]> = [
        [-0.5, 0.5],
        [0.5, 0.5],
      ];

      const partialKm = geodesicArcLengthInsideBoundary(
        arcCoords,
        squarePolygon,
        [0, 0, 1, 1],
        undefined,
      );
      const fullKm = turf.length(turf.lineString(arcCoords), { units: 'kilometers' });

      assert.equal(partialKm > 0, true);
      assert.equal(partialKm < fullKm, true);
    });
  });
});
