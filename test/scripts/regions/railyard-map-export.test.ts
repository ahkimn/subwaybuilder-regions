import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { gzipSync } from 'node:zlib';

import type { DatasetIndex } from '@regions/dataset-index';
import {
  buildManifest,
  emitCity,
  resolveShippableDatasets,
} from '@scripts/regions/railyard-map-export';
import { validateRegionsManifest } from '@subway-builder-modded/regions-schemas';

const CITY = 'TYO';

function polygonFeature(id: string, name: string) {
  return {
    type: 'Feature',
    id,
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
      ID: id,
      NAME: name,
      DISPLAY_NAME: name,
      NAME_NATIVE: name,
      LAT: 35.6,
      LNG: 139.7,
      POPULATION: 1000,
    },
  };
}

function featureCollection(features: unknown[]) {
  return { type: 'FeatureCollection', features };
}

function sampleIndex(): DatasetIndex {
  return {
    [CITY]: [
      {
        datasetId: 'shichouson',
        displayName: 'Municipalities',
        unitSingular: 'municipality',
        unitPlural: 'municipalities',
        source: 'MLIT / e-Stat',
        size: 2,
        fileSizeMB: 0.1,
      },
      {
        datasetId: 'ward-osm',
        displayName: 'Wards',
        unitSingular: 'ward',
        unitPlural: 'wards',
        source: 'OSM',
        size: 1,
      },
    ],
  };
}

const tempDirs: string[] = [];

function makeDataDir(options: { badFeature?: boolean } = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'railyard-map-data-'));
  tempDirs.push(root);
  const cityDir = path.join(root, CITY);
  fs.mkdirSync(cityDir, { recursive: true });
  const municipalities = featureCollection([
    polygonFeature('13101', 'Chiyoda'),
    options.badFeature
      ? { type: 'Feature', geometry: null, properties: {} }
      : polygonFeature('13102', 'Chuo'),
  ]);
  fs.writeFileSync(
    path.join(cityDir, 'shichouson.geojson.gz'),
    gzipSync(Buffer.from(JSON.stringify(municipalities))),
  );
  fs.writeFileSync(
    path.join(cityDir, 'ward-osm.geojson.gz'),
    gzipSync(
      Buffer.from(
        JSON.stringify(featureCollection([polygonFeature('1', 'W')])),
      ),
    ),
  );
  return root;
}

function makeOutDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'railyard-map-out-'));
  tempDirs.push(root);
  return root;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('railyard-map export', () => {
  it('excludes OSM datasets by default and resolves the .gz file', () => {
    const datasets = resolveShippableDatasets(
      CITY,
      sampleIndex(),
      false,
      makeDataDir(),
    );
    assert.deepEqual(
      datasets.map((d) => d.metadata.datasetId),
      ['shichouson'],
    );
    assert.equal(datasets[0].file, 'shichouson.geojson.gz');
  });

  it('includes OSM datasets when requested', () => {
    const datasets = resolveShippableDatasets(
      CITY,
      sampleIndex(),
      true,
      makeDataDir(),
    );
    assert.deepEqual(datasets.map((d) => d.metadata.datasetId).sort(), [
      'shichouson',
      'ward-osm',
    ]);
  });

  it('builds a schema-valid manifest with map-level country', () => {
    const dataDir = makeDataDir();
    const datasets = resolveShippableDatasets(
      CITY,
      sampleIndex(),
      false,
      dataDir,
    );
    const manifest = buildManifest(CITY, sampleIndex(), datasets);
    assert.equal(manifest.country, 'JP');
    assert.equal(manifest.datasets[0].size, 2);
    assert.equal(validateRegionsManifest(manifest).success, true);
  });

  it('emits manifest.json + shipped datasets, skipping OSM', () => {
    const outDir = makeOutDir();
    const result = emitCity(CITY, sampleIndex(), {
      dataDir: makeDataDir(),
      outDir,
    });
    assert.equal(result.ok, true);
    const regionsDir = path.join(outDir, CITY, 'regions');
    assert.ok(fs.existsSync(path.join(regionsDir, 'manifest.json')));
    assert.ok(fs.existsSync(path.join(regionsDir, 'shichouson.geojson.gz')));
    assert.ok(!fs.existsSync(path.join(regionsDir, 'ward-osm.geojson.gz')));
    const manifest = JSON.parse(
      fs.readFileSync(path.join(regionsDir, 'manifest.json'), 'utf8'),
    );
    assert.equal(validateRegionsManifest(manifest).success, true);
  });

  it('passes feature validation for conformant data', () => {
    const result = emitCity(CITY, sampleIndex(), {
      dataDir: makeDataDir(),
      outDir: makeOutDir(),
      validateFeatures: true,
    });
    assert.equal(result.ok, true);
  });

  it('fails feature validation for malformed features', () => {
    const result = emitCity(CITY, sampleIndex(), {
      dataDir: makeDataDir({ badFeature: true }),
      outDir: makeOutDir(),
      validateFeatures: true,
    });
    assert.equal(result.ok, false);
    assert.match(result.reason ?? '', /invalid_features/);
  });

  it('dry-run writes nothing', () => {
    const outDir = makeOutDir();
    const result = emitCity(CITY, sampleIndex(), {
      dataDir: makeDataDir(),
      outDir,
      dryRun: true,
    });
    assert.equal(result.ok, true);
    assert.ok(
      !fs.existsSync(path.join(outDir, CITY, 'regions', 'manifest.json')),
    );
  });

  it('prunes stale dataset files no longer in the manifest', () => {
    const outDir = makeOutDir();
    const regionsDir = path.join(outDir, CITY, 'regions');
    fs.mkdirSync(regionsDir, { recursive: true });
    fs.writeFileSync(
      path.join(regionsDir, 'removed-layer.geojson.gz'),
      'stale',
    );
    const result = emitCity(CITY, sampleIndex(), {
      dataDir: makeDataDir(),
      outDir,
    });
    assert.equal(result.ok, true);
    assert.ok(
      !fs.existsSync(path.join(regionsDir, 'removed-layer.geojson.gz')),
    );
    assert.ok(fs.existsSync(path.join(regionsDir, 'shichouson.geojson.gz')));
  });

  it('reports a missing data directory', () => {
    const result = emitCity('ZZZ', sampleIndex(), {
      dataDir: makeDataDir(),
      outDir: makeOutDir(),
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_data_directory');
  });
});
