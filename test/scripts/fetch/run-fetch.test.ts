import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runCountryExtractor } from '@scripts/fetch/run-fetch';
import type { ExtractMapFeaturesArgs } from '@scripts/utils/cli';
import type { BoundaryBox } from '@scripts/utils/geometry';

function buildArgs(
  countryCode: string,
  overrides?: Partial<ExtractMapFeaturesArgs>,
): ExtractMapFeaturesArgs {
  return {
    dataType: 'departments',
    cityCode: 'PAR',
    countryCode,
    west: 2.2,
    south: 48.8,
    east: 2.5,
    north: 49,
    compress: true,
    ...overrides,
  };
}

describe('scripts/fetch/run-fetch country dispatch', () => {
  it('routes FR extraction to FR handler', async () => {
    const calls: string[] = [];

    const extractors = {
      US: async () => {
        calls.push('US');
      },
      AU: async () => {
        calls.push('AU');
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

  it('routes AU extraction to AU handler', async () => {
    const calls: string[] = [];

    const extractors = {
      US: async () => {
        calls.push('US');
      },
      AU: async (_args: ExtractMapFeaturesArgs, bbox: BoundaryBox) => {
        calls.push('AU');
        assert.deepEqual(bbox, {
          west: 150.6,
          south: -34.2,
          east: 151.4,
          north: -33.4,
        });
      },
      GB: async () => {
        calls.push('GB');
      },
      CA: async () => {
        calls.push('CA');
      },
      FR: async () => {
        calls.push('FR');
      },
    };

    await runCountryExtractor(
      buildArgs('AU', {
        dataType: 'sa3s',
        cityCode: 'SYD',
        west: 150.6,
        south: -34.2,
        east: 151.4,
        north: -33.4,
      }),
      extractors,
    );
    assert.deepEqual(calls, ['AU']);
  });

  it('throws when country extractor is unavailable', async () => {
    const extractors = {
      US: async () => {},
      AU: async () => {},
      GB: async () => {},
      CA: async () => {},
      FR: async () => {},
    };

    await assert.rejects(() =>
      runCountryExtractor(buildArgs('XX'), extractors),
    );
  });
});
