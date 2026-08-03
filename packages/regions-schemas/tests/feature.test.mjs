import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateRegionsFeatureCollection } from '../dist/index.js';

function feature(overrides = {}) {
  return {
    type: 'Feature',
    id: '13101',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [0, 0],
        ],
      ],
    },
    properties: {
      ID: '13101',
      NAME: 'Chiyoda',
      LAT: 35.69,
      LNG: 139.75,
      ...overrides,
    },
  };
}

function collection(features) {
  return { type: 'FeatureCollection', features };
}

test('accepts a conformant feature collection', () => {
  const result = validateRegionsFeatureCollection(collection([feature()]));
  assert.equal(result.success, true);
});

test('preserves unknown passthrough properties (NAME_JA, WITHIN_BBOX)', () => {
  const result = validateRegionsFeatureCollection(
    collection([feature({ NAME_JA: '千代田', WITHIN_BBOX: true })]),
  );
  assert.equal(result.success, true);
  assert.equal(result.data.features[0].properties.NAME_JA, '千代田');
});

test('allows null POPULATION', () => {
  const result = validateRegionsFeatureCollection(
    collection([feature({ POPULATION: null })]),
  );
  assert.equal(result.success, true);
});

test('rejects a feature missing the ID join key', () => {
  const f = feature();
  delete f.properties.ID;
  assert.equal(
    validateRegionsFeatureCollection(collection([f])).success,
    false,
  );
});

test('rejects non-polygon geometry', () => {
  const f = feature();
  f.geometry = { type: 'Point', coordinates: [0, 0] };
  assert.equal(
    validateRegionsFeatureCollection(collection([f])).success,
    false,
  );
});

test('rejects an empty feature collection', () => {
  assert.equal(validateRegionsFeatureCollection(collection([])).success, false);
});
