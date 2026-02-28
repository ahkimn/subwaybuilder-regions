import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  RegistryCacheEntry,
  RegistryOrigin,
} from '../../../../shared/dataset-index';
import {
  canonicalizeLocalRegistryEntries,
  mergeLocalRegistryEntries,
  toLogicalDatasetKey,
} from '../../../../src/core/registry/cache';

function createEntry(
  origin: RegistryOrigin,
  cityCode: string,
  datasetId: string,
  overrides: Partial<RegistryCacheEntry> = {},
): RegistryCacheEntry {
  return {
    cityCode,
    datasetId,
    displayName: `${cityCode} ${datasetId}`,
    unitSingular: 'Unit',
    unitPlural: 'Units',
    source: 'Test',
    size: 0,
    dataPath: `/data/${cityCode}/${datasetId}.geojson`,
    isPresent: true,
    origin,
    compressed: false,
    ...overrides,
  };
}

describe('core/registry/cache', () => {
  it('toLogicalDatasetKey_shouldUseCityCodeAndDatasetId', () => {
    const key = toLogicalDatasetKey({ cityCode: 'AUS', datasetId: 'counties' });
    assert.equal(key, 'AUS::counties');
  });

  it('mergeLocalRegistryEntries_shouldPreferDynamicOverStatic_forSameLogicalDataset', () => {
    const staticEntry = createEntry('static', 'AUS', 'counties');
    const dynamicEntry = createEntry('dynamic', 'AUS', 'counties', {
      dataPath: '/data/AUS/counties.geojson.gz',
      compressed: true,
    });

    const merged = mergeLocalRegistryEntries([staticEntry, dynamicEntry]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].origin, 'dynamic');
    assert.equal(merged[0].dataPath, '/data/AUS/counties.geojson.gz');
  });

  it('mergeLocalRegistryEntries_shouldPreferUserOverDynamicAndStatic_forSameLogicalDataset', () => {
    const staticEntry = createEntry('static', 'AUS', 'counties');
    const dynamicEntry = createEntry('dynamic', 'AUS', 'counties');
    const userEntry = createEntry('user', 'AUS', 'counties', {
      dataPath: '/user/AUS/counties.geojson',
    });

    const merged = mergeLocalRegistryEntries([
      staticEntry,
      dynamicEntry,
      userEntry,
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].origin, 'user');
    assert.equal(merged[0].dataPath, '/user/AUS/counties.geojson');
  });

  it('mergeLocalRegistryEntries_shouldKeepDynamicEvenWhenMissing_underStrictPrecedence', () => {
    const staticEntry = createEntry('static', 'AUS', 'counties', {
      isPresent: true,
    });
    const dynamicMissingEntry = createEntry('dynamic', 'AUS', 'counties', {
      isPresent: false,
      fileSizeMB: 1.25,
    });

    const merged = mergeLocalRegistryEntries([staticEntry, dynamicMissingEntry]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].origin, 'dynamic');
    assert.equal(merged[0].isPresent, false);
  });

  it('mergeLocalRegistryEntries_shouldPreserveDistinctLogicalDatasets', () => {
    const entries = [
      createEntry('static', 'AUS', 'counties'),
      createEntry('dynamic', 'AUS', 'zctas'),
      createEntry('user', 'BOS', 'counties'),
    ];

    const merged = mergeLocalRegistryEntries(entries);
    assert.equal(merged.length, 3);
    assert.equal(
      new Set(merged.map((entry) => toLogicalDatasetKey(entry))).size,
      3,
    );
  });

  it('canonicalizeLocalRegistryEntries_shouldReportChanged_whenMergeRewritesEntries', () => {
    const staticEntry = createEntry('static', 'AUS', 'counties');
    const dynamicEntry = createEntry('dynamic', 'AUS', 'counties');
    const result = canonicalizeLocalRegistryEntries([staticEntry, dynamicEntry]);

    assert.equal(result.changed, true);
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].origin, 'dynamic');
  });

  it('canonicalizeLocalRegistryEntries_shouldReportUnchanged_whenNoMergeNeeded', () => {
    const entries = [
      createEntry('static', 'AUS', 'counties'),
      createEntry('dynamic', 'AUS', 'zctas'),
    ];
    const result = canonicalizeLocalRegistryEntries(entries);

    assert.equal(result.changed, false);
    assert.equal(result.entries.length, 2);
    assert.equal(result.entries[0], entries[0]);
    assert.equal(result.entries[1], entries[1]);
  });
});
