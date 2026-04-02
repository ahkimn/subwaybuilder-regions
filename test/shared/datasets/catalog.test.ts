import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CATALOG_STATIC_COUNTRIES,
  DATASET_METADATA_CATALOG,
  resolveCountryDatasetOrder,
  resolveCountryDatasets,
} from '@shared/datasets/catalog';

describe('shared/datasets/catalog GB metadata', () => {
  it('resolves GB dataset order with wpcs in hierarchy', () => {
    assert.deepEqual(resolveCountryDatasetOrder('GB'), [
      'districts',
      'wpcs',
      'bua',
      'wards',
    ]);
  });

  it('marks GB wpcs as online-source eligible', () => {
    assert.equal(DATASET_METADATA_CATALOG['wpcs']?.existsOnlineSource, true);
  });
});

describe('shared/datasets/catalog CA metadata', () => {
  it('marks CA peds as online-source eligible', () => {
    assert.equal(DATASET_METADATA_CATALOG['peds']?.existsOnlineSource, true);
  });
});

describe('shared/datasets/catalog FR metadata', () => {
  it('includes FR in static countries', () => {
    assert.ok(CATALOG_STATIC_COUNTRIES.includes('FR'));
  });

  it('resolves FR dataset order', () => {
    assert.deepEqual(resolveCountryDatasetOrder('FR'), [
      'departments',
      'arrondissements',
      'cantons',
      'epci',
      'communes',
    ]);
  });

  it('marks FR datasets as online-source eligible', () => {
    const datasets = resolveCountryDatasets('FR', { onlineOnly: true });
    assert.deepEqual(
      datasets.map((entry) => entry.datasetId),
      ['departments', 'arrondissements', 'cantons', 'epci', 'communes'],
    );

    for (const datasetId of [
      'departments',
      'arrondissements',
      'cantons',
      'epci',
      'communes',
    ]) {
      assert.equal(
        DATASET_METADATA_CATALOG[datasetId]?.existsOnlineSource,
        true,
      );
    }
  });
});

describe('shared/datasets/catalog AU metadata', () => {
  it('includes AU in static countries', () => {
    assert.ok(CATALOG_STATIC_COUNTRIES.includes('AU'));
  });

  it('resolves AU dataset order', () => {
    assert.deepEqual(resolveCountryDatasetOrder('AU'), [
      'sa3s',
      'sa2s',
      'ceds',
      'seds',
      'lgas',
      'poas',
    ]);
  });

  it('marks AU datasets as online-source eligible', () => {
    const datasets = resolveCountryDatasets('AU', { onlineOnly: true });
    assert.deepEqual(
      datasets.map((entry) => entry.datasetId),
      ['sa3s', 'sa2s', 'ceds', 'seds', 'lgas', 'poas'],
    );

    for (const datasetId of ['sa3s', 'sa2s', 'ceds', 'seds', 'lgas', 'poas']) {
      assert.equal(
        DATASET_METADATA_CATALOG[datasetId]?.existsOnlineSource,
        true,
      );
    }
  });
});

describe('shared/datasets/catalog JP metadata', () => {
  it('includes JP in static countries', () => {
    assert.ok(CATALOG_STATIC_COUNTRIES.includes('JP'));
  });

  it('resolves JP dataset order', () => {
    assert.deepEqual(resolveCountryDatasetOrder('JP'), ['shichouson', 'ooaza']);
  });

  it('marks JP datasets as local-only', () => {
    assert.equal(DATASET_METADATA_CATALOG['shichouson']?.existsOnlineSource, false);
    assert.equal(DATASET_METADATA_CATALOG['ooaza']?.existsOnlineSource, false);
    assert.equal(
      DATASET_METADATA_CATALOG['ooaza']?.displayName,
      '大字 (Ōaza)',
    );

    const onlineDatasets = resolveCountryDatasets('JP', { onlineOnly: true });
    assert.deepEqual(onlineDatasets, []);
  });
});
