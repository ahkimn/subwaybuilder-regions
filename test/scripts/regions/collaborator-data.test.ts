import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, afterEach, describe, it } from 'node:test';
import { gunzipSync, gzipSync } from 'node:zlib';

import { placeRegionLabels } from '@scripts/regions/labels';
import { sanitizeRegionDataset } from '@scripts/regions/sanitize';
import { validateRegionInput } from '@scripts/regions/validation';
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';

function createSquareFeature(
  properties: Record<string, unknown>,
  offset = 0,
): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [offset, offset],
          [offset + 0.01, offset],
          [offset + 0.01, offset + 0.01],
          [offset, offset + 0.01],
          [offset, offset],
        ],
      ],
    },
  };
}

function createFeatureCollection(
  features: GeoJSON.Feature[],
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

function writeGeoJSONGz(
  filePath: string,
  featureCollection: GeoJSON.FeatureCollection,
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, gzipSync(JSON.stringify(featureCollection)));
}

function readGeoJSONGz(filePath: string): GeoJSON.FeatureCollection {
  return JSON.parse(gunzipSync(fs.readFileSync(filePath)).toString('utf8'));
}

function createTempDirectory(temporaryDirectories: Set<string>): string {
  const tempDirectoryPath = fs.mkdtempSync(
    path.join(os.tmpdir(), 'regions-data-test-'),
  );
  temporaryDirectories.add(tempDirectoryPath);
  return tempDirectoryPath;
}

function supportsTarForceLocal(): boolean {
  const helpResult = spawnSync('tar', ['--help'], {
    encoding: 'utf8',
    shell: false,
  });
  return (
    !helpResult.error &&
    helpResult.status === 0 &&
    `${helpResult.stdout ?? ''}\n${helpResult.stderr ?? ''}`.includes(
      '--force-local',
    )
  );
}

function createArchive(sourceRoot: string, cityCode: string): string {
  const archivePath = path.join(sourceRoot, `${cityCode}.gz`);
  const args = ['-czf', archivePath, '-C', sourceRoot, cityCode];
  if (supportsTarForceLocal()) {
    args.unshift('--force-local');
  }
  const result = spawnSync('tar', args, {
    encoding: 'utf8',
    shell: false,
  });
  assert.equal(result.status, 0, result.stderr);
  return archivePath;
}

describe('scripts/regions collaborator data workflow', () => {
  const temporaryDirectories = new Set<string>();

  afterEach(() => {
    for (const tempDirectoryPath of temporaryDirectories) {
      fs.rmSync(tempDirectoryPath, { recursive: true, force: true });
    }
    temporaryDirectories.clear();
  });

  after(() => {
    for (const tempDirectoryPath of temporaryDirectories) {
      fs.rmSync(tempDirectoryPath, { recursive: true, force: true });
    }
    temporaryDirectories.clear();
  });

  it('validates canonical PE archive layout and warns when labels are missing', () => {
    const tempRoot = createTempDirectory(temporaryDirectories);
    const cityDir = path.join(tempRoot, 'AQP');
    const province = createSquareFeature({
      ID: '0401',
      NAME: 'Arequipa',
      DISPLAY_NAME: 'Arequipa',
      POPULATION: 10,
      TOTAL_AREA: 1,
      AREA_WITHIN_BBOX: 1,
    });
    const district = createSquareFeature(
      {
        ID: '040101',
        NAME: 'District',
        DISPLAY_NAME: 'District',
        POPULATION: 10,
        TOTAL_AREA: 1,
        AREA_WITHIN_BBOX: 1,
      },
      0.02,
    );
    const manzana = createSquareFeature(
      {
        ID: '040101001',
        NAME: '001',
        DISPLAY_NAME: '001',
        POPULATION: 10,
        TOTAL_AREA: 1,
        AREA_WITHIN_BBOX: 1,
      },
      0.04,
    );

    writeGeoJSONGz(
      path.join(cityDir, 'pe-provinces.geojson.gz'),
      createFeatureCollection([province]),
    );
    writeGeoJSONGz(
      path.join(cityDir, 'pe-districts.geojson.gz'),
      createFeatureCollection([district]),
    );
    writeGeoJSONGz(
      path.join(cityDir, 'pe-manzanas.geojson.gz'),
      createFeatureCollection([manzana]),
    );
    fs.writeFileSync(
      path.join(cityDir, 'data_index.json'),
      JSON.stringify({
        cityCode: 'AQP',
        countryCode: 'PE',
        datasets: [
          { id: 'pe-provinces', featureCount: 1 },
          { id: 'pe-districts', featureCount: 1 },
          { id: 'pe-manzanas', featureCount: 1 },
        ],
      }),
    );

    const archivePath = createArchive(tempRoot, 'AQP');
    const report = validateRegionInput({ inputPath: archivePath });

    assert.equal(report.ok, true);
    assert.equal(report.cityCode, 'AQP');
    assert.equal(report.countryCode, 'PE');
    assert.equal(report.datasets.length, 3);
    assert.equal(
      report.warnings.some((warning) => warning.includes('missing LAT/LNG')),
      true,
    );

    const strictReport = validateRegionInput({
      inputPath: archivePath,
      requireLabels: true,
    });
    assert.equal(strictReport.ok, false);
    assert.equal(
      strictReport.errors.some((error) => error.includes('missing LAT/LNG')),
      true,
    );
  });

  it('sanitizes CN lowercase id samples into canonical dataset output', () => {
    const tempRoot = createTempDirectory(temporaryDirectories);
    const inputPath = path.join(tempRoot, 'DistrictsBeijing.geojson.gz');
    writeGeoJSONGz(
      inputPath,
      createFeatureCollection([
        createSquareFeature({
          id: 'relation/1',
          NAME: 'Dongcheng',
          DISPLAY_NAME: '东城区 (Dongcheng District)',
          POPULATION: 10,
        }),
      ]),
    );

    const outputRoot = path.join(tempRoot, 'data');
    const result = sanitizeRegionDataset({
      inputPath,
      countryCode: 'CN',
      outputRoot,
    });

    assert.equal(result.cityCode, 'PEK');
    assert.equal(result.datasetId, 'cn-districts');
    assert.equal(fs.existsSync(result.outputPath), true);

    const outputCollection = readGeoJSONGz(result.outputPath);
    assert.equal(outputCollection.features[0].properties?.ID, 'relation/1');
    assert.equal(outputCollection.features[0].properties?.id, undefined);
    assert.equal(outputCollection.features[0].properties?.NAME, 'Dongcheng');
    assert.equal(
      outputCollection.features[0].properties?.DISPLAY_NAME,
      '东城区 (Dongcheng District)',
    );
    assert.equal(
      typeof outputCollection.features[0].properties?.TOTAL_AREA,
      'number',
    );
  });

  it('places labels inside polygon features', () => {
    const tempRoot = createTempDirectory(temporaryDirectories);
    const inputPath = path.join(tempRoot, 'cn-districts.geojson.gz');
    writeGeoJSONGz(
      inputPath,
      createFeatureCollection([
        createSquareFeature({
          ID: 'relation/1',
          NAME: 'Dongcheng',
          DISPLAY_NAME: '东城区 (Dongcheng District)',
          POPULATION: 10,
          TOTAL_AREA: 1,
          AREA_WITHIN_BBOX: 1,
        }),
      ]),
    );

    const outputRoot = path.join(tempRoot, 'labels');
    const result = placeRegionLabels({ inputPath, outputRoot });
    const outputCollection = readGeoJSONGz(result.outputs[0].outputPath);
    const outputFeature = outputCollection.features[0];
    const lat = outputFeature.properties?.LAT;
    const lng = outputFeature.properties?.LNG;

    assert.equal(typeof lat, 'number');
    assert.equal(typeof lng, 'number');
    assert.equal(
      turf.booleanPointInPolygon(
        turf.point([lng as number, lat as number]),
        outputFeature as Feature<Polygon>,
      ),
      true,
    );
  });

  it('supports CN sanitize-label-validate chain', () => {
    const tempRoot = createTempDirectory(temporaryDirectories);
    const districtsInputPath = path.join(
      tempRoot,
      'DistrictsBeijing.geojson.gz',
    );
    const subdistrictsInputPath = path.join(
      tempRoot,
      'SubdistrictsBeijing.geojson.gz',
    );
    writeGeoJSONGz(
      districtsInputPath,
      createFeatureCollection([
        createSquareFeature({
          id: 'relation/1',
          NAME: 'Dongcheng',
          DISPLAY_NAME: '东城区 (Dongcheng District)',
          POPULATION: 10,
        }),
      ]),
    );
    writeGeoJSONGz(
      subdistrictsInputPath,
      createFeatureCollection([
        createSquareFeature({
          id: 'relation/2',
          NAME: 'Donghuamen',
          DISPLAY_NAME: '东华门街道 (Donghuamen Subdistrict)',
          POPULATION: 10,
        }),
      ]),
    );

    const sanitizedRoot = path.join(tempRoot, 'data');
    sanitizeRegionDataset({
      inputPath: districtsInputPath,
      countryCode: 'CN',
      outputRoot: sanitizedRoot,
    });
    sanitizeRegionDataset({
      inputPath: subdistrictsInputPath,
      countryCode: 'CN',
      outputRoot: sanitizedRoot,
    });

    const labeledRoot = path.join(tempRoot, 'labeled');
    placeRegionLabels({
      inputPath: path.join(sanitizedRoot, 'PEK'),
      outputRoot: labeledRoot,
    });

    const report = validateRegionInput({
      inputPath: path.join(labeledRoot, 'PEK'),
      requireLabels: true,
    });

    assert.equal(report.ok, true);
    assert.deepEqual(report.datasets.map((entry) => entry.datasetId).sort(), [
      'cn-districts',
      'cn-subdistricts',
    ]);
  });
});
