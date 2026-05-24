import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { gunzipSync } from 'node:zlib';

import { DATA_INDEX_FILE } from '@regions/constants';
import {
  buildTWLiSourceCollection,
  buildTWTownshipSourceCollection,
  extractTWBoundaries,
  loadTWBundleContext,
} from '@scripts/extract/extract-tw-map-features';
import type { ExtractMapFeaturesArgs } from '@scripts/utils/cli';
import { DBFFile, type FieldDescriptor } from 'dbffile';
import fs from 'fs-extra';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

type PolygonFeature = Feature<Polygon>;

const ORIGINAL_SOURCE_ROOT = process.env.SUBWAYBUILDER_JP_DATA_ROOT;
const temporaryDirectories = new Set<string>();

const dbfFields: FieldDescriptor[] = [
  { name: 'VILLCODE', type: 'C', size: 16 },
  { name: 'VILLENG', type: 'C', size: 80 },
];

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
): PolygonFeature {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'Polygon',
      coordinates,
    },
  };
}

function featureCollection(
  features: PolygonFeature[],
): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features,
  };
}

async function writeGeoJson(
  targetPath: string,
  payload: GeoJSON.FeatureCollection,
): Promise<void> {
  await fs.ensureDir(path.dirname(targetPath));
  await fs.writeJson(targetPath, payload);
}

async function createVillageDbf(sourceRoot: string): Promise<void> {
  const dbfPath = path.join(
    sourceRoot,
    'tw',
    'raw',
    'tw_moi_village_boundaries',
    'current',
    'extracted',
    'VILLAGE_NLSC_1150407.dbf',
  );
  await fs.ensureDir(path.dirname(dbfPath));
  const dbf = await DBFFile.create(dbfPath, dbfFields);
  await dbf.appendRecords([
    {
      VILLCODE: '63000010001',
      VILLENG: 'Xinyi Vil.',
    },
    {
      VILLCODE: '63000010002',
      VILLENG: 'Renai Vil.',
    },
    {
      VILLCODE: '63000020001',
      VILLENG: 'Minsheng Vil.',
    },
  ]);
}

async function createTWFixture(): Promise<{
  args: ExtractMapFeaturesArgs;
  outputRoot: string;
  sourceRoot: string;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'regions-tw-'));
  temporaryDirectories.add(root);
  const sourceRoot = path.join(root, 'jp-data');
  const outputRoot = path.join(root, 'output');
  const bundleRoot = path.join(sourceRoot, 'bundles', 'twtest', 'phase_inputs');

  await fs.ensureDir(bundleRoot);
  await fs.writeJson(path.join(sourceRoot, 'bundles', 'index.json'), {
    bundles: [
      {
        bundle_id: 'twtest',
        city_code: 'TWT',
        country: 'TW',
      },
      {
        bundle_id: 'wrong-country',
        city_code: 'BAD',
        country: 'PL',
      },
    ],
  });

  await writeGeoJson(
    path.join(bundleRoot, 'boundary.geojson'),
    featureCollection([
      polygonFeature(
        [
          [
            [0, 0],
            [3, 0],
            [3, 2],
            [0, 2],
            [0, 0],
          ],
        ],
        {
          country: 'TW',
          municipality_codes: ['63000010', '63000020'],
          pref_codes: ['63000'],
          municipality_code_length: 8,
        },
      ),
    ]),
  );

  await writeGeoJson(
    path.join(sourceRoot, 'tw', 'raw', 'chocho_sets', 'twtest.geojson'),
    featureCollection([
      polygonFeature(
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
        {
          chocho_key: '63000010001',
          municipality_code: '63000010',
          pref_code: '63000',
          village_name: '信義里',
          township_name: '中正區',
          population: 10,
        },
      ),
      polygonFeature(
        [
          [
            [1, 0],
            [2, 0],
            [2, 1],
            [1, 1],
            [1, 0],
          ],
        ],
        {
          chocho_key: '63000010002',
          municipality_code: '63000010',
          pref_code: '63000',
          village_name: '仁愛里',
          village_name_en: 'Renai',
          township_name: '中正區',
          population: 20,
        },
      ),
      polygonFeature(
        [
          [
            [0, 1],
            [1, 1],
            [1, 2],
            [0, 2],
            [0, 1],
          ],
        ],
        {
          chocho_key: '63000020001',
          municipality_code: '63000020',
          pref_code: '63000',
          village_name: '民生里',
          township_name: '大同區',
          township_name_en: 'Datong District',
          pop_total: 30,
        },
      ),
      polygonFeature(
        [
          [
            [2, 1],
            [3, 1],
            [3, 2],
            [2, 2],
            [2, 1],
          ],
        ],
        {
          chocho_key: '63000010P01',
          municipality_code: '63000010',
          pref_code: '63000',
          village_name: null,
          township_name: '中正區',
          population: 0,
        },
      ),
      polygonFeature(
        [
          [
            [5, 5],
            [6, 5],
            [6, 6],
            [5, 6],
            [5, 5],
          ],
        ],
        {
          chocho_key: '65000010001',
          municipality_code: '65000010',
          pref_code: '65000',
          village_name: '外部里',
          township_name: '外部區',
          population: 999,
        },
      ),
    ]),
  );

  await fs.ensureDir(path.join(sourceRoot, 'resources'));
  await fs.writeFile(
    path.join(sourceRoot, 'resources', 'tw_municipalities.csv'),
    [
      'muni_code,muni_name,muni_name_en',
      '63000,臺北市,Taipei',
      '63000010,中正區,Zhongzheng',
      '63000020,大同區,Datong',
    ].join('\n'),
    'utf8',
  );
  await createVillageDbf(sourceRoot);
  process.env.SUBWAYBUILDER_JP_DATA_ROOT = sourceRoot;

  return {
    sourceRoot,
    outputRoot,
    args: {
      dataType: 'all',
      cityCode: 'TWT',
      countryCode: 'TW',
      bundle: 'twtest',
      compress: true,
      outputRoot,
    },
  };
}

function loadOutputGeoJson(
  outputRoot: string,
  cityCode: string,
  datasetId: string,
): GeoJSON.FeatureCollection {
  const outputPath = path.join(outputRoot, cityCode, `${datasetId}.geojson.gz`);
  const rawOutput = fs.readFileSync(outputPath);
  return JSON.parse(
    gunzipSync(rawOutput).toString('utf8'),
  ) as GeoJSON.FeatureCollection;
}

describe('scripts/extract/extract-tw-map-features context', () => {
  it('loadTWBundleContext_shouldLoadTaiwanEightDigitMunicipalityCodes', async () => {
    const { sourceRoot } = await createTWFixture();

    const context = await loadTWBundleContext(sourceRoot, 'twtest');

    assert.deepEqual(Array.from(context.municipalityCodes), [
      '63000010',
      '63000020',
    ]);
    assert.deepEqual(context.prefCodes, ['63000']);
    assert.equal(
      context.municipalityNamesByCode.get('63000010')?.en,
      'Zhongzheng',
    );
    assert.equal(context.villageEnglishNamesByCode.get('63000010001'), 'Xinyi');
  });

  it('loadTWBundleContext_shouldRejectWrongCountryBundle', async () => {
    const { sourceRoot } = await createTWFixture();

    await assert.rejects(
      () => loadTWBundleContext(sourceRoot, 'wrong-country'),
      /belongs to PL, not TW/,
    );
  });
});

describe('scripts/extract/extract-tw-map-features source collections', () => {
  it('buildTWSourceCollections_shouldFilterBundleTownshipsAndResolveNames', async () => {
    const { sourceRoot } = await createTWFixture();
    const context = await loadTWBundleContext(sourceRoot, 'twtest');

    const li = buildTWLiSourceCollection(context);
    const township = buildTWTownshipSourceCollection(context);

    assert.equal(li.features.length, 3);
    assert.equal(township.features.length, 2);
    assert.equal(
      li.features.find(
        (feature) => feature.properties?.SOURCE_ID === '63000010001',
      )?.properties?.NAME_EN_SOURCE,
      'Xinyi',
    );
    assert.equal(
      township.features.find(
        (feature) => feature.properties?.SOURCE_ID === '63000010',
      )?.properties?.NAME_EN_SOURCE,
      'Zhongzheng',
    );
  });
});

describe('scripts/extract/extract-tw-map-features integration', () => {
  it('extractTWBoundaries_shouldGenerateTownshipAndLiOutputs', async () => {
    const { args, outputRoot } = await createTWFixture();

    await extractTWBoundaries(args);

    const township = loadOutputGeoJson(outputRoot, 'TWT', 'township');
    const li = loadOutputGeoJson(outputRoot, 'TWT', 'li');
    const dataIndex = await fs.readJson(path.join(outputRoot, DATA_INDEX_FILE));

    assert.deepEqual(
      dataIndex.TWT.map((entry: { datasetId: string }) => entry.datasetId),
      ['township', 'li'],
    );

    const xinyi = li.features.find(
      (feature) => feature.properties?.ID === '63000010001',
    );
    assert.ok(xinyi);
    assert.equal(xinyi.properties?.NAME_ZH, '信義里');
    assert.equal(xinyi.properties?.NAME_EN, 'Xinyi');
    assert.equal(xinyi.properties?.NAME, '信義里\nXinyi');
    assert.equal(xinyi.properties?.DISPLAY_NAME, xinyi.properties?.NAME);

    const renai = li.features.find(
      (feature) => feature.properties?.ID === '63000010002',
    );
    assert.ok(renai);
    assert.equal(renai.properties?.NAME_EN, 'Renai');

    const zhongzheng = township.features.find(
      (feature) => feature.properties?.ID === '63000010',
    );
    assert.ok(zhongzheng);
    assert.equal(zhongzheng.properties?.POPULATION, 30);
    assert.equal(zhongzheng.properties?.NAME_ZH, '中正區');
    assert.equal(zhongzheng.properties?.NAME_EN, 'Zhongzheng');
    assert.equal(zhongzheng.properties?.NAME, '中正區\nZhongzheng');
  });
});
