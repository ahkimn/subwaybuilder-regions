import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CATALOG_STATIC_COUNTRIES,
  DATASET_METADATA_CATALOG,
  resolveCountryDatasetOrder,
  resolveCountryDatasets,
} from '@shared/datasets/catalog';

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
