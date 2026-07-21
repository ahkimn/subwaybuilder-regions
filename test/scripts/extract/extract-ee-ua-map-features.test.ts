import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { gunzipSync } from 'node:zlib';

import { extractEEBoundaries } from '@scripts/extract/extract-ee-map-features';
import { extractUABoundaries } from '@scripts/extract/extract-ua-map-features';
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

function polygon(
  x: number,
  properties: GeoJSON.GeoJsonProperties,
): Feature<Polygon> {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [x, 0],
          [x + 1, 0],
          [x + 1, 1],
          [x, 1],
          [x, 0],
        ],
      ],
    },
  };
}

async function writeCollection(
  targetPath: string,
  features: Feature<Polygon>[],
): Promise<void> {
  await fs.ensureDir(path.dirname(targetPath));
  await fs.writeJson(targetPath, {
    type: 'FeatureCollection',
    features,
  } satisfies FeatureCollection<Polygon>);
}

async function fixture(country: 'EE' | 'UA', bundleId: string) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `regions-${country}-`));
  temporaryDirectories.add(root);
  const sourceRoot = path.join(root, 'jp-data');
  const outputRoot = path.join(root, 'output');
  const phaseInputs = path.join(
    sourceRoot,
    'bundles',
    bundleId,
    'phase_inputs',
  );
  await fs.ensureDir(phaseInputs);
  await fs.writeJson(path.join(sourceRoot, 'bundles', 'index.json'), {
    bundles: [{ bundle_id: bundleId, city_code: 'TST', country }],
  });
  process.env.SUBWAYBUILDER_JP_DATA_ROOT = sourceRoot;
  return { outputRoot, phaseInputs };
}

function readGzip(targetPath: string): FeatureCollection {
  return JSON.parse(gunzipSync(fs.readFileSync(targetPath)).toString('utf8'));
}

function args(
  countryCode: string,
  bundle: string,
  outputRoot: string,
): ExtractMapFeaturesArgs {
  return {
    cityCode: 'TST',
    countryCode,
    bundle,
    dataType: 'all',
    outputRoot,
    compress: true,
  };
}

describe('EE external bundle extraction', () => {
  it('extracts counties, omavalitsused, and settlement units', async () => {
    const { outputRoot, phaseInputs } = await fixture('EE', 'eetest');
    await writeCollection(path.join(phaseInputs, 'boundary.geojson'), [
      polygon(0, {
        municipality_codes: ['0001'],
        pref_codes: ['0099'],
      }),
    ]);
    await writeCollection(path.join(phaseInputs, 'chocho_selected.geojson'), [
      polygon(0, {
        chocho_key: '00010001',
        chocho_name: 'Küla',
        pop_total: 25,
      }),
    ]);
    await writeCollection(
      path.join(phaseInputs, 'region_municipality_selected.geojson'),
      [
        polygon(0, {
          region_key: '0001',
          region_name: 'Test',
          pref_code: '0099',
          pref_name: 'Test maakond',
          pop_total: 25,
        }),
      ],
    );

    await extractEEBoundaries(args('EE', 'eetest', outputRoot));
    for (const datasetId of [
      'ee-maakond',
      'ee-omavalitsused',
      'ee-asustusuksused',
    ]) {
      const collection = readGzip(
        path.join(outputRoot, 'TST', `${datasetId}.geojson.gz`),
      );
      assert.equal(collection.features.length, 1);
      assert.equal(collection.features[0].properties?.POPULATION, 25);
    }
  });
});

describe('UA external bundle extraction', () => {
  it('substitutes districts, names rural areas, and emits bilingual fields', async () => {
    const { outputRoot, phaseInputs } = await fixture('UA', 'uatest');
    await writeCollection(path.join(phaseInputs, 'boundary.geojson'), [
      polygon(0, { municipality_codes: ['UA1234567D01'] }),
    ]);
    await writeCollection(path.join(phaseInputs, 'chocho_selected.geojson'), [
      polygon(0, {
        chocho_key: 'UA1234567D01',
        chocho_name: 'Центральний район',
        municipality_name: 'Тестова громада',
        municipality_name_en: 'Test Hromada',
        raion_code: 'UA1200',
        raion_name_uk: 'Тестовий район',
        raion_name_en: 'Test Raion',
        pop_total: 30,
      }),
      polygon(1, {
        chocho_key: 'UA1234567999',
        chocho_name: 'remainder',
        municipality_name: 'Тестова громада',
        municipality_name_en: 'Test Hromada',
        raion_code: 'UA1200',
        raion_name_uk: 'Тестовий район',
        raion_name_en: 'Test Raion',
        pop_total: 20,
      }),
    ]);

    await extractUABoundaries(args('UA', 'uatest', outputRoot));
    const hromadas = readGzip(
      path.join(outputRoot, 'TST', 'ua-hromadas.geojson.gz'),
    );
    assert.equal(hromadas.features.length, 2);
    assert.ok(
      hromadas.features.some(
        (feature) =>
          feature.properties?.NAME ===
          'Тестова громада (сільські околиці)\nTest Hromada rural area',
      ),
    );
    assert.ok(
      hromadas.features.some(
        (feature) => feature.properties?.NAME_EN === 'Tsentralnyi district',
      ),
    );
    const settlements = readGzip(
      path.join(outputRoot, 'TST', 'ua-naseleni-punkty.geojson.gz'),
    );
    assert.ok(
      settlements.features.some((feature) =>
        feature.properties?.NAME_UK?.includes('сільські околиці'),
      ),
    );
    const raions = readGzip(
      path.join(outputRoot, 'TST', 'ua-raions.geojson.gz'),
    );
    assert.equal(raions.features[0].properties?.POPULATION, 50);
    assert.equal(raions.features[0].properties?.NAME_EN, 'Test Raion');
  });
});
