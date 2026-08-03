import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  REGIONS_MANIFEST_SCHEMA_VERSION,
  validateRegionsManifest,
} from '../dist/index.js';

function validManifest() {
  return {
    schemaVersion: REGIONS_MANIFEST_SCHEMA_VERSION,
    cityCode: 'TYO',
    country: 'JP',
    datasets: [
      {
        datasetId: 'shichouson',
        displayName: 'Municipalities',
        unitSingular: 'municipality',
        unitPlural: 'municipalities',
        source: 'MLIT / e-Stat',
        file: 'shichouson.geojson.gz',
        size: 62,
        fileSizeMB: 1.2,
      },
    ],
  };
}

test('accepts a well-formed manifest', () => {
  const result = validateRegionsManifest(validManifest());
  assert.equal(result.success, true);
});

test('rejects an unsupported schemaVersion', () => {
  const result = validateRegionsManifest({
    ...validManifest(),
    schemaVersion: 99,
  });
  assert.equal(result.success, false);
});

test('rejects a dataset missing datasetId', () => {
  const manifest = validManifest();
  delete manifest.datasets[0].datasetId;
  const result = validateRegionsManifest(manifest);
  assert.equal(result.success, false);
});

test('rejects an empty datasets array', () => {
  const result = validateRegionsManifest({ ...validManifest(), datasets: [] });
  assert.equal(result.success, false);
});

test('rejects duplicate datasetIds', () => {
  const manifest = validManifest();
  manifest.datasets.push({ ...manifest.datasets[0], file: 'other.geojson.gz' });
  const result = validateRegionsManifest(manifest);
  assert.equal(result.success, false);
  assert.ok(result.errors.some((e) => e.includes('duplicate datasetId')));
});

test('accepts an optional per-layer style override', () => {
  const manifest = validManifest();
  manifest.datasets[0].style = {
    light: { fill: '#5b8def', fillOpacity: 0.5, line: '#1f3d7a' },
    dark: { fill: '#2c4f9e', label: '#8fb0ff' },
  };
  assert.equal(validateRegionsManifest(manifest).success, true);
});

test('rejects a non-hex style color', () => {
  const manifest = validManifest();
  manifest.datasets[0].style = { light: { fill: 'cornflowerblue' } };
  assert.equal(validateRegionsManifest(manifest).success, false);
});

test('rejects a style opacity outside 0..1', () => {
  const manifest = validManifest();
  manifest.datasets[0].style = { dark: { fillOpacity: 1.5 } };
  assert.equal(validateRegionsManifest(manifest).success, false);
});

test('rejects absolute or traversing file paths', () => {
  for (const file of [
    '/etc/passwd',
    '..\\escape.geojson.gz',
    'C:\\abs.geojson.gz',
  ]) {
    const manifest = validManifest();
    manifest.datasets[0].file = file;
    assert.equal(
      validateRegionsManifest(manifest).success,
      false,
      `should reject ${file}`,
    );
  }
});
