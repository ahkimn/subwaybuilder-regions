import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runCountryExtractor } from '@scripts/fetch/run-fetch';
import type { ExtractMapFeaturesArgs } from '@scripts/utils/cli';
import type { BoundaryBox } from '@scripts/utils/geometry';

function buildArgs(countryCode: string): ExtractMapFeaturesArgs {
  return {
    dataType: 'departments',
    cityCode: 'PAR',
    countryCode,
    west: 2.2,
    south: 48.8,
    east: 2.5,
    north: 49,
    compress: true,
  };
}

describe('scripts/fetch/run-fetch country dispatch', () => {
  it('routes FR extraction to FR handler', async () => {
    const calls: string[] = [];

    const extractors = {
      US: async () => {
        calls.push('US');
      },
      GB: async () => {
        calls.push('GB');
      },
      CA: async () => {
        calls.push('CA');
      },
      FR: async (_args: ExtractMapFeaturesArgs, bbox: BoundaryBox) => {
        calls.push('FR');
        assert.deepEqual(bbox, {
          west: 2.2,
          south: 48.8,
          east: 2.5,
          north: 49,
        });
      },
    };

    await runCountryExtractor(buildArgs('FR'), extractors);
    assert.deepEqual(calls, ['FR']);
  });

  it('throws when country extractor is unavailable', async () => {
    const extractors = {
      US: async () => {},
      GB: async () => {},
      CA: async () => {},
      FR: async () => {},
    };

    await assert.rejects(() =>
      runCountryExtractor(buildArgs('XX'), extractors),
    );
  });
});
