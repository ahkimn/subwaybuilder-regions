import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { gunzipSync } from 'node:zlib';

import { extractLTBoundaries } from '@scripts/extract/extract-lt-map-features';
import { extractLVBoundaries } from '@scripts/extract/extract-lv-map-features';
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

async function fixture(country: 'LV' | 'LT', bundleId: string) {
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

describe('LV external bundle extraction', () => {
  it('emits municipalities (pop from chocho) and the DPA-free sub-municipal grain', async () => {
    const { outputRoot, phaseInputs } = await fixture('LV', 'lvtest');
    await writeCollection(path.join(phaseInputs, 'boundary.geojson'), [
      polygon(0, {
        municipality_codes: ['0001000'],
        pref_codes: ['99'],
      }),
    ]);
    // chocho still drives lv-pasvaldibas population (summed by parent_lgu).
    await writeCollection(path.join(phaseInputs, 'chocho_selected.geojson'), [
      polygon(0, {
        chocho_key: 'LVRIG01',
        chocho_name: 'Kleisti',
        chocho_kind: 'apkaime',
        parent_lgu: '0001000',
        pop_total: 60,
      }),
      polygon(1, {
        chocho_key: 'LVRIG02',
        chocho_name: 'Bolderāja',
        chocho_kind: 'dpa',
        parent_lgu: '0001000',
        pop_total: 40,
      }),
    ]);
    // lv-apkaimes now reads the clean sub-municipal layer (apkaime + pagasts),
    // not the chocho — no DPA fragments.
    await writeCollection(
      path.join(phaseInputs, 'sub_municipal_selected.geojson'),
      [
        polygon(0, {
          code: 'LVRIG01',
          name: 'Kleisti',
          l1_type: 'apkaime',
          pop_total: 60,
        }),
        polygon(1, {
          code: 'LV0001100',
          name: 'Testes pagasts',
          l1_type: 'pagasts',
          pop_total: 40,
        }),
      ],
    );
    await writeCollection(
      path.join(phaseInputs, 'region_municipality_selected.geojson'),
      [
        polygon(0, {
          lgu_atvk: '0001000',
          nosaukums: 'Rīga',
          atrib: '0001000',
        }),
      ],
    );

    await extractLVBoundaries(args('LV', 'lvtest', outputRoot));

    const pasvaldibas = readGzip(
      path.join(outputRoot, 'TST', 'lv-pasvaldibas.geojson.gz'),
    );
    assert.equal(pasvaldibas.features.length, 1);
    assert.equal(pasvaldibas.features[0].properties?.NAME, 'Rīga');
    assert.equal(pasvaldibas.features[0].properties?.POPULATION, 100);

    const apkaimes = readGzip(
      path.join(outputRoot, 'TST', 'lv-apkaimes.geojson.gz'),
    );
    assert.equal(apkaimes.features.length, 2);
    assert.ok(
      apkaimes.features.some(
        (feature) =>
          feature.properties?.NAME === 'Kleisti' &&
          feature.properties?.POPULATION === 60,
      ),
    );
    assert.ok(
      apkaimes.features.some(
        (feature) => feature.properties?.NAME === 'Testes pagasts',
      ),
    );
  });
});

describe('LT external bundle extraction', () => {
  it('dissolves savivaldybės/seniūnijos and joins names from the committed lookup', async () => {
    const { outputRoot, phaseInputs } = await fixture('LT', 'lttest');
    await writeCollection(path.join(phaseInputs, 'boundary.geojson'), [
      polygon(0, {
        municipality_codes: ['13'],
        municipality_code_length: 2,
        pref_codes: ['13'],
      }),
    ]);
    await writeCollection(path.join(phaseInputs, 'chocho_selected.geojson'), [
      polygon(0, {
        savivaldybe_code: '13',
        municipality_code: '1301',
        chocho_key: 'LT13B01',
        chocho_name: 'Vietovė A',
        pop_total: 40,
      }),
      polygon(1, {
        savivaldybe_code: '13',
        municipality_code: '1302',
        chocho_key: 'LT13B02',
        chocho_name: 'Vietovė B',
        pop_total: 60,
      }),
    ]);

    await extractLTBoundaries(args('LT', 'lttest', outputRoot));

    const savivaldybes = readGzip(
      path.join(outputRoot, 'TST', 'lt-savivaldybes.geojson.gz'),
    );
    assert.equal(savivaldybes.features.length, 1);
    assert.equal(savivaldybes.features[0].properties?.NAME, 'Vilniaus m. sav.');
    assert.equal(savivaldybes.features[0].properties?.POPULATION, 100);

    const seniunijos = readGzip(
      path.join(outputRoot, 'TST', 'lt-seniunijos.geojson.gz'),
    );
    assert.equal(seniunijos.features.length, 2);
    assert.ok(
      seniunijos.features.some(
        (feature) => feature.properties?.NAME === 'Antakalnio sen.',
      ),
    );
    assert.ok(
      seniunijos.features.some(
        (feature) => feature.properties?.NAME === 'Fabijoniškių sen.',
      ),
    );

    const gyvenvietes = readGzip(
      path.join(outputRoot, 'TST', 'lt-gyvenvietes.geojson.gz'),
    );
    assert.equal(gyvenvietes.features.length, 2);
    assert.ok(
      gyvenvietes.features.some(
        (feature) => feature.properties?.NAME === 'Vietovė A',
      ),
    );
  });
});
