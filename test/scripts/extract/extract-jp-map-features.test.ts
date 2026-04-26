import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { gunzipSync, gzipSync } from 'node:zlib';

import { DATA_INDEX_FILE } from '@regions/constants';
import {
  buildMunicipalityPopulationMap,
  deriveOoazaName,
  extractJPBoundaries,
  formatBilingualName,
  romanizeJapaneseName,
  selectDominantOazaName,
} from '@scripts/extract/extract-jp-map-features';
import type { ExtractMapFeaturesArgs } from '@scripts/utils/cli';
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
        city_name_ja: '\u51fd\u9928\u5e02',
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
          chocho_key: '01101100101',
          municipality_code: '01101',
          pref_code: '01',
          pop_total: 40,
          chocho_name: '\u5927\u901a\u4e00\u4e01\u76ee',
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
          chocho_key: '01101100102',
          municipality_code: '01101',
          pref_code: '01',
          pop_total: 60,
          chocho_name: '\u5927\u901a\u4e8c\u4e01\u76ee',
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
          chocho_key: '01101999999',
          municipality_code: '01101',
          pref_code: '01',
          pop_total: 25,
          chocho_name: '\u5357\u753a',
        },
      ),
      polygonFeature(
        [
          [
            [1, 1],
            [1.5, 1],
            [1.5, 1.5],
            [1, 1.5],
            [1, 1],
          ],
        ],
        {
          chocho_key: '01101000201',
          municipality_code: '01101',
          pref_code: '01',
          pop_total: 10,
          chocho_name: '\u5927\u5b57\u672c\u5bae\u5b57\u6771',
        },
      ),
      polygonFeature(
        [
          [
            [1.5, 1],
            [2, 1],
            [2, 1.5],
            [1.5, 1.5],
            [1.5, 1],
          ],
        ],
        {
          chocho_key: '01101000301',
          municipality_code: '01101',
          pref_code: '01',
          pop_total: 15,
          chocho_name: '\u5b57\u672c\u5bae\u5b57\u897f',
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
          N03_004: '\u672d\u5e4c\u5e02',
          N03_005: '\u4e2d\u592e\u533a',
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
          N03_004: '\u672d\u5e4c\u5e02',
          N03_005: '\u5317\u533a',
          N03_007: '01102',
        },
      ),
    ]),
    { compress: true },
  );

  await createNeighborhoodBoundaryZip(sourceRoot, '01', [
    {
      KEY_CODE: '01101100101',
      KCODE1: '1001',
      S_AREA: '100100',
      S_NAME: '\u5927\u901a\u4e00\u4e01\u76ee',
    },
    {
      KEY_CODE: '01101100102',
      KCODE1: '1001',
      S_AREA: '100100',
      S_NAME: '\u5927\u901a\u4e8c\u4e01\u76ee',
    },
    {
      KEY_CODE: '01101999999',
      KCODE1: '9999',
      S_AREA: '999900',
      S_NAME: '\u5357\u753a',
    },
    {
      KEY_CODE: '01101000201',
      KCODE1: '0002',
      S_AREA: '000200',
      S_NAME: '\u5927\u5b57\u672c\u5bae\u5b57\u6771',
    },
    {
      KEY_CODE: '01101000301',
      KCODE1: '0003',
      S_AREA: '000300',
      S_NAME: '\u5b57\u672c\u5bae\u5b57\u897f',
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

async function createHamamatsuCompatFixture(): Promise<{
  args: ExtractMapFeaturesArgs;
  outputRoot: string;
}> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'regions-jp-hamamatsu-'),
  );
  temporaryDirectories.add(root);
  const sourceRoot = path.join(root, 'jp-data');
  const outputRoot = path.join(root, 'output');
  const bundleRoot = path.join(
    sourceRoot,
    'bundles',
    'shizuoka_hamamatsu',
    'phase_inputs',
  );

  await fs.ensureDir(bundleRoot);
  await fs.ensureDir(path.join(sourceRoot, 'neighborhood7_boundaries'));

  await fs.writeJson(path.join(sourceRoot, 'bundles', 'index.json'), {
    bundles: [
      {
        bundle_id: 'shizuoka_hamamatsu',
        city_code: 'FSZ',
        city_name_en: 'Shizuoka / Hamamatsu',
        city_name_ja: '\u9759\u5ca1\u30fb\u6d5c\u677e',
      },
    ],
  });

  await writeGeoJson(path.join(bundleRoot, 'boundary.geojson'), {
    type: 'FeatureCollection',
    features: [
      polygonFeature(boundaryPolygonCoordinates, {
        municipality_codes: ['22138'],
        pref_codes: ['22'],
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
          chocho_key: '22131000101',
          municipality_code: '22131',
          pref_code: '22',
          pop_total: 40,
          chocho_name: '\u5143\u57ce\u753a',
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
          chocho_key: '22132000102',
          municipality_code: '22132',
          pref_code: '22',
          pop_total: 60,
          chocho_name: '\u5143\u57ce\u753a\u4e8c\u4e01\u76ee',
        },
      ),
    ]),
  );

  await writeGeoJson(
    path.join(sourceRoot, 'N03-20240101.geojson.gz'),
    featureCollection([
      polygonFeature(boundaryPolygonCoordinates, {
        N03_004: '\u6d5c\u677e\u5e02',
        N03_005: '\u4e2d\u592e\u533a',
        N03_007: '22138',
      }),
    ]),
    { compress: true },
  );

  await createNeighborhoodBoundaryZip(sourceRoot, '22', [
    {
      KEY_CODE: '22131000101',
      KCODE1: '0001',
      S_AREA: '000100',
      S_NAME: '\u5143\u57ce\u753a',
    },
    {
      KEY_CODE: '22132000102',
      KCODE1: '0001',
      S_AREA: '000100',
      S_NAME: '\u5143\u57ce\u753a\u4e8c\u4e01\u76ee',
    },
  ]);

  process.env.SUBWAYBUILDER_JP_DATA_ROOT = sourceRoot;

  return {
    outputRoot,
    args: {
      dataType: 'all',
      cityCode: 'FSZTEST',
      countryCode: 'JP',
      bundle: 'shizuoka_hamamatsu',
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

  it('buildMunicipalityPopulationMap_shouldMapLegacyHamamatsuWardCodesToCurrentCodes', () => {
    const populationMap = buildMunicipalityPopulationMap(
      featureCollection([
        polygonFeature(boundaryPolygonCoordinates, {
          municipality_code: '22131',
          pref_code: '22',
          pop_total: 40,
        }),
        polygonFeature(boundaryPolygonCoordinates, {
          municipality_code: '22132',
          pref_code: '22',
          pop_total: 60,
        }),
        polygonFeature(boundaryPolygonCoordinates, {
          municipality_code: '22135',
          pref_code: '22',
          pop_total: 15,
        }),
      ]),
    );

    assert.equal(populationMap.get('22138'), 100);
    assert.equal(populationMap.get('22139'), 15);
  });

  it('selectDominantOazaName_shouldPreferLargestPopulationWeight', () => {
    const winner = selectDominantOazaName(
      new Map([
        ['\u5927\u901a', 120],
        ['\u5357\u753a', 20],
      ]),
    );

    assert.equal(winner, '\u5927\u901a');
  });

  it('formatBilingualName_shouldComposeJapaneseAndEnglishLabels', () => {
    assert.equal(
      formatBilingualName('\u6771\u4eac', 'T\u014dky\u014d'),
      '\u6771\u4eac\nT\u014dky\u014d',
    );
    assert.equal(formatBilingualName('\u6771\u4eac', ''), '\u6771\u4eac');
  });

  it('deriveOoazaName_shouldCollapseAzaAndChomeToOoazaLevel', () => {
    assert.equal(
      deriveOoazaName(
        '\u98ef\u91ce\u753a\u660e\u6cbb\u5b57\u897f\u559c\u5e73\u8535\u5185',
      ),
      '\u98ef\u91ce\u753a\u660e\u6cbb',
    );
    assert.equal(deriveOoazaName('\u5b57\u5c71\u5d0e'), '\u5c71\u5d0e');
    assert.equal(deriveOoazaName('\u5927\u5b57\u677e\u539f'), '\u677e\u539f');
    assert.equal(
      deriveOoazaName('\u5927\u901a\u4e8c\u4e01\u76ee'),
      '\u5927\u901a',
    );
    assert.equal(deriveOoazaName('\u5357\u753a'), '\u5357\u753a');
  });

  it('romanizeJapaneseName_shouldEmitMacronizedHepburn', async () => {
    assert.equal(await romanizeJapaneseName('\u5927\u58c7'), '\u014cdan');
    assert.equal(
      await romanizeJapaneseName('\u845b\u5c3e\u6751'),
      'Katsurao Mura',
    );
    assert.equal(
      await romanizeJapaneseName('\u4e8c\u672c\u677e'),
      'Nihonmatsu',
    );
    assert.equal(
      await romanizeJapaneseName('\u897f\u4e2d\u592e'),
      'Nishi Ch\u016b\u014d',
    );
    assert.equal(await romanizeJapaneseName('\u6771\u4eac'), 'T\u014dky\u014d');
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
    assert.equal(mergedOoaza.properties?.NAME_JA, '\u5927\u901a');
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
    assert.equal(fallbackOoaza.properties?.NAME_JA, '\u5357\u753a');

    const mergedSameNameOoaza = ooaza.features.find(
      (feature) => feature.properties?.ID === '011010002',
    );
    assert.ok(mergedSameNameOoaza);
    assert.equal(mergedSameNameOoaza.properties?.POPULATION, 25);
    assert.equal(mergedSameNameOoaza.properties?.NAME_JA, '\u672c\u5bae');
    assert.equal(
      ooaza.features.filter(
        (feature) => feature.properties?.NAME_JA === '\u672c\u5bae',
      ).length,
      1,
    );

    const municipality = shichouson.features.find(
      (feature) => feature.properties?.ID === '01101',
    );
    assert.ok(municipality);
    assert.equal(municipality.properties?.POPULATION, 150);
    assert.equal(
      municipality.properties?.NAME_JA,
      '\u672d\u5e4c\u5e02\u4e2d\u592e\u533a',
    );
    assert.match(
      String(municipality.properties?.NAME_EN),
      /[\u0101\u0113\u012b\u014d\u016b]/,
    );
    assert.equal(municipality.properties?.WITHIN_BBOX, true);
    assert.ok(
      Math.abs(
        Number(municipality.properties?.AREA_WITHIN_BBOX) -
          Number(municipality.properties?.TOTAL_AREA),
      ) < 1e-9,
    );
  });

  it('extractJPBoundaries_shouldKeepHamamatsuOoazaWhenBoundaryUsesCurrentWardCodes', async () => {
    const { args, outputRoot } = await createHamamatsuCompatFixture();

    await extractJPBoundaries(args);

    const ooaza = loadOutputGeoJson(outputRoot, 'FSZTEST', 'ooaza');
    const shichouson = loadOutputGeoJson(outputRoot, 'FSZTEST', 'shichouson');

    const ooazaFeature = ooaza.features.find(
      (feature) => feature.properties?.ID === '221380001',
    );
    assert.ok(ooazaFeature);
    assert.equal(ooazaFeature.properties?.POPULATION, 100);

    const municipality = shichouson.features.find(
      (feature) => feature.properties?.ID === '22138',
    );
    assert.ok(municipality);
    assert.equal(municipality.properties?.POPULATION, 100);
  });
});
