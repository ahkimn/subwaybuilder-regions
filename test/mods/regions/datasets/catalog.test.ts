import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CATALOG_STATIC_COUNTRIES,
  DATASET_METADATA_CATALOG,
  resolveCountryDatasetOrder,
  resolveCountryDatasets,
} from '@regions/datasets/catalog';

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
    assert.equal(
      DATASET_METADATA_CATALOG['shichouson']?.existsOnlineSource,
      false,
    );
    assert.equal(DATASET_METADATA_CATALOG['ooaza']?.existsOnlineSource, false);
    assert.equal(DATASET_METADATA_CATALOG['ooaza']?.displayName, '大字 (Ōaza)');

    const onlineDatasets = resolveCountryDatasets('JP', { onlineOnly: true });
    assert.deepEqual(onlineDatasets, []);
  });
});

describe('shared/datasets/catalog CZ metadata', () => {
  it('includes CZ in static countries', () => {
    assert.ok(CATALOG_STATIC_COUNTRIES.includes('CZ'));
  });

  it('resolves CZ dataset order', () => {
    assert.deepEqual(resolveCountryDatasetOrder('CZ'), [
      'okres',
      'obce',
      'zsj',
    ]);
  });

  it('marks CZ datasets as local-only', () => {
    for (const datasetId of ['okres', 'obce', 'zsj']) {
      assert.equal(
        DATASET_METADATA_CATALOG[datasetId]?.existsOnlineSource,
        false,
      );
    }

    const onlineDatasets = resolveCountryDatasets('CZ', { onlineOnly: true });
    assert.deepEqual(onlineDatasets, []);
  });
});

describe('shared/datasets/catalog PL metadata', () => {
  it('includes PL in static countries', () => {
    assert.ok(CATALOG_STATIC_COUNTRIES.includes('PL'));
  });

  it('resolves PL dataset order', () => {
    assert.deepEqual(resolveCountryDatasetOrder('PL'), [
      'powiat',
      'gmina',
      'rejon',
    ]);
  });

  it('marks PL datasets as local-only', () => {
    for (const datasetId of ['powiat', 'gmina', 'rejon']) {
      assert.equal(
        DATASET_METADATA_CATALOG[datasetId]?.existsOnlineSource,
        false,
      );
    }

    const onlineDatasets = resolveCountryDatasets('PL', { onlineOnly: true });
    assert.deepEqual(onlineDatasets, []);
  });
});

describe('shared/datasets/catalog TW metadata', () => {
  it('includes TW in static countries', () => {
    assert.ok(CATALOG_STATIC_COUNTRIES.includes('TW'));
  });

  it('resolves TW dataset order', () => {
    assert.deepEqual(resolveCountryDatasetOrder('TW'), ['township', 'li']);
  });

  it('marks TW datasets as local-only with bilingual dataset names', () => {
    for (const datasetId of ['township', 'li']) {
      assert.equal(
        DATASET_METADATA_CATALOG[datasetId]?.existsOnlineSource,
        false,
      );
    }
    assert.equal(
      DATASET_METADATA_CATALOG['township']?.displayName,
      '鄉鎮市區 (Townships)',
    );
    assert.equal(DATASET_METADATA_CATALOG['li']?.displayName, '里 (Villages)');

    const onlineDatasets = resolveCountryDatasets('TW', { onlineOnly: true });
    assert.deepEqual(onlineDatasets, []);
  });
});

describe('shared/datasets/catalog PE metadata', () => {
  it('includes PE in static countries', () => {
    assert.ok(CATALOG_STATIC_COUNTRIES.includes('PE'));
  });

  it('resolves PE dataset order', () => {
    assert.deepEqual(resolveCountryDatasetOrder('PE'), [
      'pe-provinces',
      'pe-districts',
      'pe-manzanas',
    ]);
  });

  it('marks PE datasets as local-only', () => {
    for (const datasetId of ['pe-provinces', 'pe-districts', 'pe-manzanas']) {
      assert.equal(
        DATASET_METADATA_CATALOG[datasetId]?.existsOnlineSource,
        false,
      );
    }

    const onlineDatasets = resolveCountryDatasets('PE', { onlineOnly: true });
    assert.deepEqual(onlineDatasets, []);
  });
});

describe('shared/datasets/catalog CN metadata', () => {
  it('includes CN in static countries', () => {
    assert.ok(CATALOG_STATIC_COUNTRIES.includes('CN'));
  });

  it('resolves CN dataset order', () => {
    assert.deepEqual(resolveCountryDatasetOrder('CN'), [
      'cn-districts',
      'cn-subdistricts',
    ]);
  });

  it('marks CN datasets as local-only with bilingual dataset names', () => {
    for (const datasetId of ['cn-districts', 'cn-subdistricts']) {
      assert.equal(
        DATASET_METADATA_CATALOG[datasetId]?.existsOnlineSource,
        false,
      );
    }
    assert.equal(
      DATASET_METADATA_CATALOG['cn-districts']?.displayName,
      '区县 (Districts)',
    );
    assert.equal(
      DATASET_METADATA_CATALOG['cn-subdistricts']?.displayName,
      '街道/乡镇 (Subdistricts)',
    );

    const onlineDatasets = resolveCountryDatasets('CN', { onlineOnly: true });
    assert.deepEqual(onlineDatasets, []);
  });
});
