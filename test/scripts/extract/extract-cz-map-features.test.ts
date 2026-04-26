import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { gunzipSync } from 'node:zlib';

import { DATA_INDEX_FILE } from '@regions/constants';
import {
  buildCZObceSourceCollection,
  buildCZOkresSourceCollection,
  buildCZZsjSourceCollection,
  extractCZBoundaries,
  loadCZBundleContext,
} from '@scripts/extract/extract-cz-map-features';
import type { ExtractMapFeaturesArgs } from '@scripts/utils/cli';
import fs from 'fs-extra';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

const ORIGINAL_SOURCE_ROOT = process.env.SUBWAYBUILDER_JP_DATA_ROOT;
const temporaryDirectories = new Set<string>();

afterEach(async () => {
  if (ORIGINAL_SOURCE_ROOT === undefined) {
    delete process.env.SUBWAYBUILDER_JP_DATA_ROOT;
  } else {
    process.env.SUBWAYBUILDER_JP_DATA_ROOT = ORIGINAL_SOURCE_ROOT;
  }

  for (const directory of temporaryDirectories) {
    await fs.remove(directory);
  }
  temporaryDirectories.clear();
});

function polygonFeature(
  coordinates: Polygon['coordinates'],
  properties: GeoJSON.GeoJsonProperties,
): Feature<Polygon> {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'Polygon',
      coordinates,
    },
  };
}

function square(
  west: number,
  south: number,
  east: number,
  north: number,
): Polygon['coordinates'] {
  return [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ];
}

async function writeGeoJson(
  targetPath: string,
  payload: GeoJSON.FeatureCollection,
): Promise<void> {
  await fs.ensureDir(path.dirname(targetPath));
  await fs.writeJson(targetPath, payload);
}

function readGzippedGeoJson(targetPath: string): FeatureCollection {
  return JSON.parse(gunzipSync(fs.readFileSync(targetPath)).toString('utf8'));
}

async function createCZFixture(options?: { bundleCountry?: string }): Promise<{
  args: ExtractMapFeaturesArgs;
  outputRoot: string;
  sourceRoot: string;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'regions-cz-'));
  temporaryDirectories.add(root);
  const sourceRoot = path.join(root, 'jp-data');
  const outputRoot = path.join(root, 'output');
  const phaseInputRoot = path.join(
    sourceRoot,
    'bundles',
    'prague',
    'phase_inputs',
  );
  const regionsRoot = path.join(sourceRoot, 'cz', 'regions');

  await fs.ensureDir(phaseInputRoot);
  await fs.ensureDir(regionsRoot);
  await fs.writeJson(path.join(sourceRoot, 'bundles', 'index.json'), {
    bundles: [
      {
        bundle_id: 'prague',
        city_code: 'PRG',
        city_name_en: 'Prague',
        country: options?.bundleCountry ?? 'CZ',
      },
    ],
  });

  await writeGeoJson(path.join(phaseInputRoot, 'boundary.geojson'), {
    type: 'FeatureCollection',
    features: [
      polygonFeature(square(0, 0, 3, 1), {
        municipality_codes: ['500001', '500002'],
        municipality_code_length: 6,
        country: 'CZ',
      }),
    ],
  });

  await writeGeoJson(path.join(regionsRoot, 'obce.geojson'), {
    type: 'FeatureCollection',
    features: [
      polygonFeature(square(0, 0, 1, 1), {
        obec_code: '500001',
        obec_name: 'Praha',
        population: 100,
      }),
      polygonFeature(square(1, 0, 2, 1), {
        obec_code: '500002',
        obec_name: 'Brno-venkov',
        population: 200,
      }),
      polygonFeature(square(5, 0, 6, 1), {
        obec_code: '599999',
        obec_name: 'Mimo',
        population: 300,
      }),
    ],
  });

  await writeGeoJson(path.join(regionsRoot, 'okres.geojson'), {
    type: 'FeatureCollection',
    features: [
      polygonFeature(square(0, 0, 2, 1), {
        okres_code: 'CZ0100',
        okres_name: 'Praha-východ',
        municipality_codes: ['500001', '500002', '599999'],
      }),
      polygonFeature(square(5, 0, 6, 1), {
        okres_code: 'CZ0999',
        okres_name: 'Mimo',
        municipality_codes: ['599999'],
      }),
    ],
  });

  await fs.writeFile(
    path.join(regionsRoot, 'zsj_dil_names.csv'),
    [
      'chocho_key,zsj_dil_code,zsj_code,parent_obec_code,name',
      '5000010000001,0000001,000000,500001,Žižkov',
      '5000020000002,0000002,000000,500002,Černá Pole',
      '5999990000003,0000003,000000,599999,Mimo',
      '',
    ].join('\n'),
    'utf8',
  );

  await writeGeoJson(path.join(phaseInputRoot, 'chocho_selected.geojson'), {
    type: 'FeatureCollection',
    features: [
      polygonFeature(square(0, 0, 1, 1), {
        chocho_key: '5000010000001',
        municipality_code: '500001',
        pop_total: 80,
      }),
      polygonFeature(square(1, 0, 2, 1), {
        chocho_key: '5000020000002',
        municipality_code: '500002',
        pop_total: 160,
      }),
      polygonFeature(square(5, 0, 6, 1), {
        chocho_key: '5999990000003',
        municipality_code: '599999',
        pop_total: 220,
      }),
    ],
  });

  process.env.SUBWAYBUILDER_JP_DATA_ROOT = sourceRoot;

  return {
    sourceRoot,
    outputRoot,
    args: {
      dataType: 'all',
      cityCode: 'PRGX',
      countryCode: 'CZ',
      bundle: 'prague',
      includeLabelPointCandidates: false,
      compress: true,
      outputRoot,
    },
  };
}

describe('CZ map feature extraction', () => {
  it('loadCZBundleContext_shouldLoadSixDigitMunicipalityCodes', async () => {
    const { sourceRoot } = await createCZFixture();

    const context = loadCZBundleContext(sourceRoot, 'prague');

    assert.deepEqual(Array.from(context.municipalityCodes), [
      '500001',
      '500002',
    ]);
  });

  it('loadCZBundleContext_shouldRejectCountryMismatch', async () => {
    const { sourceRoot } = await createCZFixture({ bundleCountry: 'JP' });

    assert.throws(
      () => loadCZBundleContext(sourceRoot, 'prague'),
      /belongs to JP, not CZ/,
    );
  });

  it('buildCZSourceCollections_shouldFilterByCodesAndPreservePopulationsAndNames', async () => {
    const { sourceRoot } = await createCZFixture();
    const context = loadCZBundleContext(sourceRoot, 'prague');

    const obce = buildCZObceSourceCollection(context);
    const okres = buildCZOkresSourceCollection(context);
    const zsj = buildCZZsjSourceCollection(context);

    assert.deepEqual(
      obce.features.map((feature) => feature.properties?.SOURCE_ID),
      ['500001', '500002'],
    );
    assert.deepEqual(
      obce.features.map((feature) => feature.properties?.SOURCE_NAME),
      ['Praha', 'Brno-venkov'],
    );
    assert.equal(okres.features.length, 1);
    assert.equal(okres.features[0].properties?.SOURCE_NAME, 'Praha-východ');
    assert.equal(okres.features[0].properties?.POPULATION, 300);
    assert.deepEqual(
      zsj.features.map((feature) => feature.properties?.SOURCE_NAME),
      ['Žižkov', 'Černá Pole'],
    );
    assert.deepEqual(
      zsj.features.map((feature) => feature.properties?.POPULATION),
      [80, 160],
    );
  });

  it('buildCZZsjSourceCollection_shouldFailWithSetupMessage_whenLabelsAreMissing', async () => {
    const { sourceRoot } = await createCZFixture();
    const context = loadCZBundleContext(sourceRoot, 'prague');
    await fs.remove(
      path.join(sourceRoot, 'cz', 'regions', 'zsj_dil_names.csv'),
    );

    assert.throws(
      () => buildCZZsjSourceCollection(context),
      /Missing CZ ZSJ-díl labels/,
    );
  });

  it('extractCZBoundaries_shouldWriteAllDatasetsToCityCodeOverride', async () => {
    const { args, outputRoot } = await createCZFixture();

    await extractCZBoundaries(args);

    const outputDir = path.join(outputRoot, 'PRGX');
    const okres = readGzippedGeoJson(path.join(outputDir, 'okres.geojson.gz'));
    const obce = readGzippedGeoJson(path.join(outputDir, 'obce.geojson.gz'));
    const zsj = readGzippedGeoJson(path.join(outputDir, 'zsj.geojson.gz'));
    const dataIndex = await fs.readJson(path.join(outputRoot, DATA_INDEX_FILE));

    assert.equal(okres.features.length, 1);
    assert.equal(obce.features.length, 2);
    assert.equal(zsj.features.length, 2);
    assert.equal(okres.features[0].properties?.NAME, 'Praha-východ');
    assert.equal(zsj.features[0].properties?.NAME, 'Žižkov');
    assert.equal(zsj.features[0].properties?.NAME_JA, undefined);
    assert.equal(zsj.features[0].properties?.NAME_EN, undefined);
    assert.equal(dataIndex.PRGX[0].country, 'CZ');
    assert.deepEqual(
      dataIndex.PRGX.map((dataset: { datasetId: string }) => dataset.datasetId),
      ['okres', 'obce', 'zsj'],
    );
  });
});
