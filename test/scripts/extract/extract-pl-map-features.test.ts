import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { gunzipSync } from 'node:zlib';

import { DATA_INDEX_FILE } from '@regions/constants';
import {
  buildPLGminaSourceCollection,
  buildPLPowiatSourceCollection,
  buildPLRejonSourceCollection,
  extractPLBoundaries,
  loadPLBundleContext,
} from '@scripts/extract/extract-pl-map-features';
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

async function createPLFixture(options?: { bundleCountry?: string }): Promise<{
  args: ExtractMapFeaturesArgs;
  outputRoot: string;
  sourceRoot: string;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'regions-pl-'));
  temporaryDirectories.add(root);
  const sourceRoot = path.join(root, 'jp-data');
  const outputRoot = path.join(root, 'output');
  const phaseInputRoot = path.join(
    sourceRoot,
    'bundles',
    'warsaw',
    'phase_inputs',
  );
  const regionsRoot = path.join(sourceRoot, 'pl', 'regions');

  await fs.ensureDir(phaseInputRoot);
  await fs.ensureDir(regionsRoot);
  await fs.writeJson(path.join(sourceRoot, 'bundles', 'index.json'), {
    bundles: [
      {
        bundle_id: 'warsaw',
        city_code: 'WAR',
        city_name_en: 'Warsaw',
        country: options?.bundleCountry ?? 'PL',
      },
    ],
  });

  // Bundle boundary: includes gmina 1465011 + 1465012; excludes 9999999.
  await writeGeoJson(path.join(phaseInputRoot, 'boundary.geojson'), {
    type: 'FeatureCollection',
    features: [
      polygonFeature(square(0, 0, 3, 1), {
        municipality_codes: ['1465011', '1465012'],
        municipality_code_length: 7,
        country: 'PL',
      }),
    ],
  });

  // Canonical gmina.geojson (3 gminas; 2 in bundle, 1 outside).
  await writeGeoJson(path.join(regionsRoot, 'gmina.geojson'), {
    type: 'FeatureCollection',
    features: [
      polygonFeature(square(0, 0, 1, 1), {
        gmina_code: '1465011',
        gmina_name: 'Warszawa',
        powiat_code: '1465',
      }),
      polygonFeature(square(1, 0, 2, 1), {
        gmina_code: '1465012',
        gmina_name: 'Pruszków',
        powiat_code: '1465',
      }),
      polygonFeature(square(5, 0, 6, 1), {
        gmina_code: '9999999',
        gmina_name: 'Outside',
        powiat_code: '9999',
      }),
    ],
  });

  // Canonical powiat.geojson: powiat 1465 (containing both bundle gminas)
  // and powiat 9999 (out of bundle).
  await writeGeoJson(path.join(regionsRoot, 'powiat.geojson'), {
    type: 'FeatureCollection',
    features: [
      polygonFeature(square(0, 0, 2, 1), {
        powiat_code: '1465',
        powiat_name: 'Warszawa-zachodni',
        municipality_codes: ['1465011', '1465012'],
      }),
      polygonFeature(square(5, 0, 6, 1), {
        powiat_code: '9999',
        powiat_name: 'Outside',
        municipality_codes: ['9999999'],
      }),
    ],
  });

  // Per-bundle chocho_selected: 2 rejony in bundle gminas, 1 outside.
  await writeGeoJson(path.join(phaseInputRoot, 'chocho_selected.geojson'), {
    type: 'FeatureCollection',
    features: [
      polygonFeature(square(0, 0, 1, 1), {
        chocho_key: '1465011000001',
        municipality_code: '1465011',
        pop_total: 800,
      }),
      polygonFeature(square(1, 0, 2, 1), {
        chocho_key: '1465012000002',
        municipality_code: '1465012',
        pop_total: 200,
      }),
      polygonFeature(square(5, 0, 6, 1), {
        chocho_key: '9999999000003',
        municipality_code: '9999999',
        pop_total: 50,
      }),
    ],
  });

  process.env.SUBWAYBUILDER_JP_DATA_ROOT = sourceRoot;

  return {
    sourceRoot,
    outputRoot,
    args: {
      dataType: 'all',
      cityCode: 'WARX',
      countryCode: 'PL',
      bundle: 'warsaw',
      includeLabelPointCandidates: false,
      compress: true,
      outputRoot,
    },
  };
}

describe('PL map feature extraction', () => {
  it('loadPLBundleContext_shouldLoadSevenDigitGminaCodes', async () => {
    const { sourceRoot } = await createPLFixture();

    const context = loadPLBundleContext(sourceRoot, 'warsaw');

    assert.deepEqual(Array.from(context.municipalityCodes), [
      '1465011',
      '1465012',
    ]);
  });

  it('loadPLBundleContext_shouldRejectCountryMismatch', async () => {
    const { sourceRoot } = await createPLFixture({ bundleCountry: 'CZ' });

    assert.throws(
      () => loadPLBundleContext(sourceRoot, 'warsaw'),
      /belongs to CZ, not PL/,
    );
  });

  it('buildPLSourceCollections_shouldFilterByCodesAndSumPopulationFromRejony', async () => {
    const { sourceRoot } = await createPLFixture();
    const context = loadPLBundleContext(sourceRoot, 'warsaw');

    const gmina = buildPLGminaSourceCollection(context);
    const powiat = buildPLPowiatSourceCollection(context);
    const rejon = buildPLRejonSourceCollection(context);

    assert.deepEqual(
      gmina.features.map((feature) => feature.properties?.SOURCE_ID),
      ['1465011', '1465012'],
    );
    assert.deepEqual(
      gmina.features.map((feature) => feature.properties?.SOURCE_NAME),
      ['Warszawa', 'Pruszków'],
    );
    // Gmina pop derived by summing chocho_selected.pop_total per gmina.
    assert.deepEqual(
      gmina.features.map((feature) => feature.properties?.POPULATION),
      [800, 200],
    );

    assert.equal(powiat.features.length, 1);
    assert.equal(powiat.features[0].properties?.SOURCE_ID, '1465');
    assert.equal(
      powiat.features[0].properties?.SOURCE_NAME,
      'Warszawa-zachodni',
    );
    // Powiat pop = sum of bundle gmina pops = 800 + 200.
    assert.equal(powiat.features[0].properties?.POPULATION, 1000);

    assert.deepEqual(
      rejon.features.map((feature) => feature.properties?.SOURCE_ID),
      ['1465011000001', '1465012000002'],
    );
    // PL rejony are anonymous — display name falls back to the chocho_key.
    assert.deepEqual(
      rejon.features.map((feature) => feature.properties?.SOURCE_NAME),
      ['1465011000001', '1465012000002'],
    );
    assert.deepEqual(
      rejon.features.map((feature) => feature.properties?.POPULATION),
      [800, 200],
    );
  });

  it('extractPLBoundaries_shouldWriteAllDatasetsToCityCodeOverride', async () => {
    const { args, outputRoot } = await createPLFixture();

    await extractPLBoundaries(args);

    const outputDir = path.join(outputRoot, 'WARX');
    const powiat = readGzippedGeoJson(
      path.join(outputDir, 'powiat.geojson.gz'),
    );
    const gmina = readGzippedGeoJson(path.join(outputDir, 'gmina.geojson.gz'));
    const rejon = readGzippedGeoJson(path.join(outputDir, 'rejon.geojson.gz'));
    const dataIndex = await fs.readJson(path.join(outputRoot, DATA_INDEX_FILE));

    assert.equal(powiat.features.length, 1);
    assert.equal(gmina.features.length, 2);
    assert.equal(rejon.features.length, 2);
    assert.equal(powiat.features[0].properties?.NAME, 'Warszawa-zachodni');
    assert.equal(gmina.features[0].properties?.NAME, 'Warszawa');
    assert.equal(rejon.features[0].properties?.NAME, '1465011000001');
    assert.equal(dataIndex.WARX[0].country, 'PL');
    assert.deepEqual(
      dataIndex.WARX.map((dataset: { datasetId: string }) => dataset.datasetId),
      ['powiat', 'gmina', 'rejon'],
    );
  });
});
