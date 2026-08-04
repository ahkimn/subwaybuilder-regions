import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  gateLocalEntriesByRailyard,
  railyardManifestToEntries,
} from '@regions/core/registry/railyard';
import type { RegistryCacheEntry } from '@regions/dataset-index';
import type { RegionsManifest } from '@subway-builder-modded/regions-schemas';

function manifest(): RegionsManifest {
  return {
    schemaVersion: 1,
    cityCode: 'TYO',
    country: 'JP',
    datasets: [
      {
        datasetId: 'shichouson',
        displayName: 'Municipalities',
        unitSingular: 'municipality',
        unitPlural: 'municipalities',
        source: 'e-Stat',
        file: 'shichouson.geojson.gz',
        size: 62,
        fileSizeMB: 1.2,
      },
      {
        datasetId: 'ooaza',
        displayName: 'Oaza',
        unitSingular: 'oaza',
        unitPlural: 'oaza',
        source: 'e-Stat',
        file: 'ooaza.geojson',
        size: 500,
      },
    ],
  };
}

function staticEntry(cityCode: string, datasetId: string): RegistryCacheEntry {
  return {
    cityCode,
    datasetId,
    displayName: datasetId,
    unitSingular: datasetId,
    unitPlural: datasetId,
    source: 'static',
    size: 0,
    dataPath: `file:///mods/regions/data/${cityCode}/${datasetId}.geojson.gz`,
    isPresent: true,
    origin: 'static',
    compressed: true,
  };
}

describe('core/registry/railyard', () => {
  it('railyardManifestToEntries maps datasets with basePath file:// URLs', () => {
    const entries = railyardManifestToEntries('TYO', 'C:/maps/TYO', manifest());
    assert.equal(entries.length, 2);

    const shichouson = entries[0];
    assert.equal(shichouson.datasetId, 'shichouson');
    assert.equal(shichouson.origin, 'railyard');
    assert.equal(shichouson.country, 'JP');
    assert.equal(shichouson.size, 62);
    assert.equal(shichouson.isPresent, true);
    assert.equal(shichouson.compressed, true);
    assert.equal(
      shichouson.dataPath,
      'file:///C:/maps/TYO/.railyard_map/regions/shichouson.geojson.gz',
    );

    // A non-gzipped file is flagged uncompressed.
    assert.equal(entries[1].compressed, false);
    assert.equal(
      entries[1].dataPath,
      'file:///C:/maps/TYO/.railyard_map/regions/ooaza.geojson',
    );
  });

  it('gate drops ALL static entries for a self-declaring city', () => {
    const local = [
      staticEntry('TYO', 'shichouson'),
      staticEntry('TYO', 'legacy-extra'), // not in the manifest — must still be dropped
      staticEntry('OSA', 'shichouson'), // different city — retained
    ];
    const railyard = railyardManifestToEntries(
      'TYO',
      'C:/maps/TYO',
      manifest(),
    );

    const gated = gateLocalEntriesByRailyard(local, railyard);
    const byCityOrigin = gated.map(
      (e) => `${e.cityCode}:${e.datasetId}:${e.origin}`,
    );

    // TYO static entries (including legacy-extra) are gone; railyard TYO datasets present.
    assert.deepEqual(byCityOrigin.sort(), [
      'OSA:shichouson:static',
      'TYO:ooaza:railyard',
      'TYO:shichouson:railyard',
    ]);
  });

  it('gate is a no-op when no railyard entries exist', () => {
    const local = [staticEntry('TYO', 'shichouson')];
    assert.deepEqual(gateLocalEntriesByRailyard(local, []), local);
  });
});
