import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, afterEach, describe, it } from 'node:test';
import { gunzipSync, gzipSync } from 'node:zlib';

import {
  buildCSVIndex,
  loadBoundariesFromCSV,
  loadGeoJSON,
  loadGeoJSONFromNDJSON,
  saveGeoJSON,
  updateIndexJson,
} from '@scripts/utils/files';
import type { DatasetIndex, DatasetMetadata } from '@shared/dataset-index';

function loadFixture(relativeFixturePath: string): string {
  return fs.readFileSync(
    path.join(__dirname, 'fixtures', relativeFixturePath),
    'utf8',
  );
}

describe('scripts/utils/files', () => {
  const temporaryDirectories = new Set<string>();

  function createTempDirectory(): string {
    const tempDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), 'files-test-'),
    );
    temporaryDirectories.add(tempDirectoryPath);
    return tempDirectoryPath;
  }

  function cleanupTemporaryDirectories(): void {
    for (const tempDirectoryPath of temporaryDirectories) {
      fs.rmSync(tempDirectoryPath, { recursive: true, force: true });
    }
    temporaryDirectories.clear();
  }

  afterEach(() => {
    cleanupTemporaryDirectories();
  });

  after(() => {
    cleanupTemporaryDirectories();
  });

  it('saveGeoJSON_shouldWriteUncompressedAndCompressedFiles', () => {
    const tempDirectoryPath = createTempDirectory();
    const outputDirectoryPath = path.join(tempDirectoryPath, 'geojson');

    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 'A1' },
          geometry: { type: 'Point', coordinates: [10, 20] },
        },
      ],
    };

    const uncompressedPath = path.join(outputDirectoryPath, 'regions.geojson');
    saveGeoJSON(uncompressedPath, featureCollection);

    const compressedBasePath = path.join(
      outputDirectoryPath,
      'regions-compressed.geojson',
    );
    saveGeoJSON(compressedBasePath, featureCollection, { compress: true });

    assert.equal(fs.existsSync(uncompressedPath), true);
    assert.equal(fs.existsSync(`${compressedBasePath}.gz`), true);

    const loadedUncompressed = JSON.parse(
      fs.readFileSync(uncompressedPath, 'utf8'),
    );
    assert.deepEqual(loadedUncompressed, featureCollection);

    const loadedCompressed = JSON.parse(
      gunzipSync(fs.readFileSync(`${compressedBasePath}.gz`)).toString('utf8'),
    );
    assert.deepEqual(loadedCompressed, featureCollection);
  });

  it('loadGeoJSON_shouldLoadCompressedAndUncompressedFiles', () => {
    const tempDirectoryPath = createTempDirectory();

    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { code: 'NYC' },
          geometry: { type: 'Point', coordinates: [-73.935242, 40.73061] },
        },
      ],
    };

    const uncompressedPath = path.join(tempDirectoryPath, 'city.geojson');
    fs.writeFileSync(uncompressedPath, JSON.stringify(featureCollection));

    const compressedPath = path.join(tempDirectoryPath, 'city.geojson.gz');
    fs.writeFileSync(
      compressedPath,
      gzipSync(JSON.stringify(featureCollection)),
    );

    assert.deepEqual(loadGeoJSON(uncompressedPath), featureCollection);
    assert.deepEqual(loadGeoJSON(compressedPath), featureCollection);
  });

  it('loadGeoJSONFromNDJSON_shouldReadMultipleLineDelimitedFeatures', async () => {
    const tempDirectoryPath = createTempDirectory();
    const ndjsonPath = path.join(tempDirectoryPath, 'features.ndjson');

    const featureOne: GeoJSON.Feature = {
      type: 'Feature',
      properties: { code: 'A' },
      geometry: { type: 'Point', coordinates: [1, 2] },
    };
    const featureTwo: GeoJSON.Feature = {
      type: 'Feature',
      properties: { code: 'B' },
      geometry: { type: 'Point', coordinates: [3, 4] },
    };

    fs.writeFileSync(
      ndjsonPath,
      `${JSON.stringify(featureOne)}\n\n${JSON.stringify(featureTwo)}\n`,
    );

    const collection = await loadGeoJSONFromNDJSON(ndjsonPath);

    assert.equal(collection.type, 'FeatureCollection');
    assert.deepEqual(collection.features, [featureOne, featureTwo]);
  });

  it('buildCSVIndex_shouldMapKeyAndValueColumns', () => {
    const rows = [
      { Code: 'NYC', Name: 'New York' },
      { Code: 'SFO', Name: 'San Francisco' },
      { Code: '', Name: 'Missing Key' },
      { Code: 'BOS', Name: '' },
    ];

    const index = buildCSVIndex(rows, 'Code', 'Name');

    assert.equal(index.get('NYC'), 'New York');
    assert.equal(index.get('SFO'), 'San Francisco');
    assert.equal(index.has(''), false);
    assert.equal(index.has('BOS'), false);
  });

  it('loadBoundariesFromCSV_shouldParseValidRowsAndIgnoreMalformedRows', () => {
    const tempDirectoryPath = createTempDirectory();
    const csvPath = path.join(tempDirectoryPath, 'boundaries.csv');

    fs.writeFileSync(
      csvPath,
      [
        'Code,South,West,North,East',
        'NYC,40.4,-74.3,40.9,-73.6',
        'BAD,NaN,-73.0,41.0,-72.5',
        'MISSING_CODE,40.1,-73.2,40.3,',
        ',39.0,-120.0,40.0,-119.0',
      ].join('\n'),
    );

    const boundaries = loadBoundariesFromCSV(csvPath);

    assert.equal(boundaries.size, 1);
    assert.deepEqual(boundaries.get('NYC'), {
      south: 40.4,
      west: -74.3,
      north: 40.9,
      east: -73.6,
    });
  });

  it('updateIndexJson_shouldCreateCityEntryFromFixtureIndex', () => {
    const tempDirectoryPath = createTempDirectory();
    const indexPath = path.join(tempDirectoryPath, 'data_index.json');
    fs.writeFileSync(indexPath, loadFixture('index-base.fixture.json'));

    const datasetEntry: DatasetMetadata = {
      datasetId: 'wards',
      displayName: 'Wards',
      unitSingular: 'ward',
      unitPlural: 'wards',
      source: 'test',
      size: 42,
    };

    updateIndexJson(indexPath, 'CHI', datasetEntry, 'ZZ');

    const index = JSON.parse(
      fs.readFileSync(indexPath, 'utf8'),
    ) as DatasetIndex;
    assert.deepEqual(index.CHI, [datasetEntry]);
    assert.equal(index.BOS[0]?.datasetId, 'counties');
    assert.equal(index.SFO[0]?.datasetId, 'districts');
  });

  it('updateIndexJson_shouldUpdateExistingDatasetEntryFromFixtureIndex', () => {
    const tempDirectoryPath = createTempDirectory();
    const indexPath = path.join(tempDirectoryPath, 'data_index.json');
    fs.writeFileSync(
      indexPath,
      loadFixture('index-update-existing.fixture.json'),
    );

    const updatedEntry: DatasetMetadata = {
      datasetId: 'districts',
      displayName: 'Updated Districts',
      unitSingular: 'district',
      unitPlural: 'districts',
      source: 'updated-test',
      size: 999,
    };

    updateIndexJson(indexPath, 'NYC', updatedEntry, 'ZZ');

    const index = JSON.parse(
      fs.readFileSync(indexPath, 'utf8'),
    ) as DatasetIndex;
    assert.equal(index.NYC.length, 1);
    assert.deepEqual(index.NYC[0], updatedEntry);
  });
});
