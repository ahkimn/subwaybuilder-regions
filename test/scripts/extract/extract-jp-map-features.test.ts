import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { gunzipSync, gzipSync } from 'node:zlib';

import {
  buildMunicipalityPopulationMap,
  deriveOoazaName,
  extractJPBoundaries,
  formatBilingualName,
  romanizeJapaneseName,
  selectDominantOazaName,
} from '@scripts/extract/extract-jp-map-features';
import type { ExtractMapFeaturesArgs } from '@scripts/utils/cli';
import { DATA_INDEX_FILE } from '@shared/constants';
import AdmZip from 'adm-zip';
import { DBFFile, type FieldDescriptor } from 'dbffile';
import fs from 'fs-extra';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

type PolygonFeature = Feature<Polygon>;

const ORIGINAL_JP_SOURCE_ROOT = process.env.SUBWAYBUILDER_JP_DATA_ROOT;
const boundaryPolygonCoordinates = [
  [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
    [0, 0],
  ],
] as Polygon['coordinates'];

const dbfFields: FieldDescriptor[] = [
  { name: 'KEY_CODE', type: 'C', size: 20 },
  { name: 'KCODE1', type: 'C', size: 10 },
  { name: 'S_AREA', type: 'C', size: 10 },
  { name: 'S_NAME', type: 'C', size: 60 },
];

const temporaryDirectories = new Set<string>();

afterEach(async () => {
  if (ORIGINAL_JP_SOURCE_ROOT === undefined) {
    delete process.env.SUBWAYBUILDER_JP_DATA_ROOT;
  } else {
    process.env.SUBWAYBUILDER_JP_DATA_ROOT = ORIGINAL_JP_SOURCE_ROOT;
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
  options?: { compress?: boolean },
): Promise<void> {
  await fs.ensureDir(path.dirname(targetPath));
  const serializedPayload = JSON.stringify(payload);

  if (options?.compress) {
    await fs.writeFile(targetPath, gzipSync(serializedPayload));
    return;
  }

  await fs.writeFile(targetPath, serializedPayload, 'utf8');
}

async function createNeighborhoodBoundaryZip(
  sourceRoot: string,
  prefCode: string,
  rows: Array<Record<string, string>>,
): Promise<void> {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'jp-db-'));
  temporaryDirectories.add(workspace);

  const dbfPath = path.join(workspace, `neighborhood-${prefCode}.dbf`);
  const zipPath = path.join(
    sourceRoot,
    'neighborhood7_boundaries',
    `A002005212020DDSWC${prefCode}.zip`,
  );

  await fs.ensureDir(path.dirname(zipPath));
  const dbf = await DBFFile.create(dbfPath, dbfFields, { encoding: 'cp932' });
  await dbf.appendRecords(rows);

  const zip = new AdmZip();
  zip.addLocalFile(dbfPath);
  zip.writeZip(zipPath);
}

async function createJPFixture(): Promise<{
  args: ExtractMapFeaturesArgs;
  outputRoot: string;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'regions-jp-'));
  temporaryDirectories.add(root);
  const sourceRoot = path.join(root, 'jp-data');
  const outputRoot = path.join(root, 'output');
  const bundleRoot = path.join(
    sourceRoot,
    'bundles',
    'hakodate',
    'phase_inputs',
  );

  await fs.ensureDir(bundleRoot);
  await fs.ensureDir(path.join(sourceRoot, 'neighborhood7_boundaries'));

  await fs.writeJson(path.join(sourceRoot, 'bundles', 'index.json'), {
    bundles: [
      {
        bundle_id: 'hakodate',
        city_code: 'HKD',
        city_name_en: 'Hakodate',
        city_name_ja: '函館市',
      },
    ],
  });

  await writeGeoJson(path.join(bundleRoot, 'boundary.geojson'), {
    type: 'FeatureCollection',
    features: [
      polygonFeature(boundaryPolygonCoordinates, {
        municipality_codes: ['01101'],
        pref_codes: ['01'],
      }),
    ],
  });

  await writeGeoJson(
    path.join(bundleRoot, 'chocho_selected.geojson'),
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
          chocho_key: '011010001001',
          municipality_code: '01101',
          pref_code: '01',
          pop_total: 40,
          chocho_name: '大通一丁目',
        },
      ),
      polygonFeature(
        [
          [
            [1, 0],
            [2.5, 0],
            [2.5, 1],
            [1, 1],
            [1, 0],
          ],
        ],
        {
          chocho_key: '011010001002',
          municipality_code: '01101',
          pref_code: '01',
          pop_total: 60,
          chocho_name: '大通二丁目',
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
          chocho_key: '011010009999',
          municipality_code: '01101',
          pref_code: '01',
          pop_total: 25,
          chocho_name: '南町',
        },
      ),
    ]),
  );

  await writeGeoJson(
    path.join(sourceRoot, 'N03-20240101.geojson.gz'),
    featureCollection([
      polygonFeature(
        [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
        {
          N03_004: '札幌市',
          N03_005: '中央区',
          N03_007: '01101',
        },
      ),
      polygonFeature(
        [
          [
            [3, 0],
            [4, 0],
            [4, 1],
            [3, 1],
            [3, 0],
          ],
        ],
        {
          N03_004: '札幌市',
          N03_005: '北区',
          N03_007: '01102',
        },
      ),
    ]),
    { compress: true },
  );

  await createNeighborhoodBoundaryZip(sourceRoot, '01', [
    {
      KEY_CODE: '011010001001',
      KCODE1: '1001',
      S_AREA: '100100',
      S_NAME: '大通一丁目',
    },
    {
      KEY_CODE: '011010001002',
      KCODE1: '1001',
      S_AREA: '100100',
      S_NAME: '大通二丁目',
    },
    {
      KEY_CODE: '011010009999',
      KCODE1: '9999',
      S_AREA: '999900',
      S_NAME: '南町',
    },
  ]);

  process.env.SUBWAYBUILDER_JP_DATA_ROOT = sourceRoot;

  return {
    outputRoot,
    args: {
      dataType: 'all',
      cityCode: 'JPTEST',
      countryCode: 'JP',
      bundle: 'hakodate',
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

describe('scripts/extract/extract-jp-map-features helpers', () => {
  it('buildMunicipalityPopulationMap_shouldAggregateCanonicalFiveDigitMunicipalityCodes', () => {
    const populationMap = buildMunicipalityPopulationMap(
      featureCollection([
        polygonFeature(boundaryPolygonCoordinates, {
          municipality_code: '01101',
          pref_code: '01',
          pop_total: 40,
        }),
        polygonFeature(boundaryPolygonCoordinates, {
          municipality_code: '01101',
          pref_code: '01',
          pop_total: 60,
        }),
        polygonFeature(boundaryPolygonCoordinates, {
          municipality_code: '01102',
          pref_code: '01',
          pop_total: 5,
        }),
      ]),
    );

    assert.equal(populationMap.get('01101'), 100);
    assert.equal(populationMap.get('01102'), 5);
  });

  it('buildMunicipalityPopulationMap_shouldUseChochoTotalPopulationOnly', () => {
    const populationMap = buildMunicipalityPopulationMap(
      featureCollection([
        polygonFeature(boundaryPolygonCoordinates, {
          municipality_code: '01101',
          pref_code: '01',
          pop_total: 40,
          workers: 999,
          working_age: 888,
          econ_workers: 777,
        }),
      ]),
    );

    assert.equal(populationMap.get('01101'), 40);
  });

  it('selectDominantOazaName_shouldPreferLargestPopulationWeight', () => {
    const winner = selectDominantOazaName(
      new Map([
        ['大通', 120],
        ['南町', 20],
      ]),
    );

    assert.equal(winner, '大通');
  });

  it('formatBilingualName_shouldComposeJapaneseAndEnglishLabels', () => {
    assert.equal(formatBilingualName('東京', 'Tōkyō'), '東京\nTōkyō');
    assert.equal(formatBilingualName('東京', ''), '東京');
  });

  it('deriveOoazaName_shouldCollapseAzaAndChomeToOoazaLevel', () => {
    assert.equal(deriveOoazaName('飯野町明治字西喜平蔵内'), '飯野町明治');
    assert.equal(deriveOoazaName('大通二丁目'), '大通');
    assert.equal(deriveOoazaName('南町'), '南町');
  });

  it('romanizeJapaneseName_shouldEmitMacronizedHepburn', async () => {
    assert.equal(await romanizeJapaneseName('大壇'), 'Ōdan');
    assert.equal(await romanizeJapaneseName('葛尾村'), 'Katsurao Mura');
    assert.equal(await romanizeJapaneseName('二本松'), 'Nihonmatsu');
    assert.equal(await romanizeJapaneseName('東京'), 'Tōkyō');
  });
});

describe('scripts/extract/extract-jp-map-features integration', () => {
  it('extractJPBoundaries_shouldGenerateShichousonAndOoazaOutputs', async () => {
    const { args, outputRoot } = await createJPFixture();

    await extractJPBoundaries(args);

    const ooaza = loadOutputGeoJson(outputRoot, 'JPTEST', 'ooaza');
    const shichouson = loadOutputGeoJson(outputRoot, 'JPTEST', 'shichouson');
    const dataIndex = await fs.readJson(path.join(outputRoot, DATA_INDEX_FILE));

    assert.deepEqual(
      dataIndex['JPTEST'].map(
        (entry: { datasetId: string }) => entry.datasetId,
      ),
      ['shichouson', 'ooaza'],
    );

    const mergedOoaza = ooaza.features.find(
      (feature) => feature.properties?.ID === '011011001',
    );
    assert.ok(mergedOoaza);
    assert.equal(mergedOoaza.properties?.POPULATION, 100);
    assert.equal(mergedOoaza.properties?.NAME_JA, '大通');
    assert.equal(
      mergedOoaza.properties?.DISPLAY_NAME,
      mergedOoaza.properties?.NAME,
    );
    assert.equal(mergedOoaza.properties?.WITHIN_BBOX, false);
    assert.match(String(mergedOoaza.properties?.NAME), /\n.+/);

    const fallbackOoaza = ooaza.features.find(
      (feature) => feature.properties?.ID === '011019999',
    );
    assert.ok(fallbackOoaza);
    assert.equal(fallbackOoaza.properties?.POPULATION, 25);
    assert.equal(fallbackOoaza.properties?.NAME_JA, '南町');

    const municipality = shichouson.features.find(
      (feature) => feature.properties?.ID === '01101',
    );
    assert.ok(municipality);
    assert.equal(municipality.properties?.POPULATION, 125);
    assert.equal(municipality.properties?.NAME_JA, '札幌市中央区');
    assert.match(String(municipality.properties?.NAME_EN), /[āīūēō]/);
    assert.equal(municipality.properties?.WITHIN_BBOX, true);
    assert.ok(
      Math.abs(
        Number(municipality.properties?.AREA_WITHIN_BBOX) -
          Number(municipality.properties?.TOTAL_AREA),
      ) < 1e-9,
    );
  });
});
