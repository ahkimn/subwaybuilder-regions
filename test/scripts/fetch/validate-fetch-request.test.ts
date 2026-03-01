import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FetchDatasetArgs } from '@scripts/fetch/parse-fetch-args';
import { validateFetchRequest } from '@scripts/fetch/validate-fetch-request';

type FetchRequestFixture = Pick<FetchDatasetArgs, 'countryCode' | 'datasets'>;

function buildArgs(overrides: FetchRequestFixture): FetchDatasetArgs {
  return {
    cityCode: 'TEST',
    countryCode: overrides.countryCode,
    datasets: overrides.datasets,
    bbox: {
      west: -1,
      south: -1,
      east: 1,
      north: 1,
    },
    compress: true,
    out: './data',
  };
}

describe('validateFetchRequest', () => {
  const validCountryDatasetCases: ReadonlyArray<{
    countryCode: FetchDatasetArgs['countryCode'];
    datasetId: string;
  }> = [
    { countryCode: 'US', datasetId: 'counties' },
    { countryCode: 'US', datasetId: 'county-subdivisions' },
    { countryCode: 'US', datasetId: 'zctas' },
    { countryCode: 'CA', datasetId: 'feds' },
    { countryCode: 'CA', datasetId: 'csds' },
    { countryCode: 'CA', datasetId: 'fsas' },
    { countryCode: 'GB', datasetId: 'districts' },
    { countryCode: 'GB', datasetId: 'bua' },
    { countryCode: 'GB', datasetId: 'wards' },
    { countryCode: 'FR', datasetId: 'departments' },
    { countryCode: 'FR', datasetId: 'arrondissements' },
    { countryCode: 'FR', datasetId: 'cantons' },
    { countryCode: 'FR', datasetId: 'epci' },
    { countryCode: 'FR', datasetId: 'communes' },
    { countryCode: 'AU', datasetId: 'sa3s' },
    { countryCode: 'AU', datasetId: 'sa2s' },
    { countryCode: 'AU', datasetId: 'ceds' },
    { countryCode: 'AU', datasetId: 'seds' },
    { countryCode: 'AU', datasetId: 'lgas' },
    { countryCode: 'AU', datasetId: 'poas' },
  ];

  for (const testCase of validCountryDatasetCases) {
    it(`passes for ${testCase.countryCode}/${testCase.datasetId}`, () => {
      const args = buildArgs({
        countryCode: testCase.countryCode,
        datasets: [testCase.datasetId],
      });

      assert.doesNotThrow(() => validateFetchRequest(args));
    });
  }

  it('throws when no datasets are specified', () => {
    const args = buildArgs({ countryCode: 'US', datasets: [] });

    assert.throws(() => validateFetchRequest(args), {
      message: 'At least one dataset must be specified',
    });
  });

  it('throws with disallowed and allowed datasets listed for unsupported datasets', () => {
    const args = buildArgs({
      countryCode: 'US',
      datasets: ['counties', 'invalid-dataset', 'another-invalid'],
    });

    assert.throws(
      () => validateFetchRequest(args),
      /Unsupported datasets for US: invalid-dataset, another-invalid\. Allowed: counties, county-subdivisions, zctas/,
    );
  });

  it('rejects datasets present in catalog when they are not fetch-eligible', () => {
    const args = buildArgs({
      countryCode: 'CA',
      datasets: ['peds'],
    });

    assert.throws(
      () => validateFetchRequest(args),
      /Unsupported datasets for CA: peds\. Allowed: feds, csds, fsas/,
    );
  });

  it('rejects unsupported datasets for AU with allowed list', () => {
    const args = buildArgs({
      countryCode: 'AU',
      datasets: ['counties'],
    });

    assert.throws(
      () => validateFetchRequest(args),
      /Unsupported datasets for AU: counties\. Allowed: sa3s, sa2s, ceds, seds, lgas, poas/,
    );
  });
});
