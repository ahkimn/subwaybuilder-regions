import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { parseFetchArgs } from '../../../scripts/fetch/parse-fetch-args';
import { validateFetchRequest } from '../../../scripts/fetch/validate-fetch-request';
import { installNoExternalIoGuards } from '../../helpers/no-external-io';
import {
  createScriptTestHarness,
  expectExitCode,
} from '../../helpers/script-test-harness';

describe('scripts/fetch-city-datasets smoke flow (parse + validate)', () => {
  const harness = createScriptTestHarness();
  let restoreNoExternalIo: (() => void) | undefined;

  beforeEach(() => {
    harness.install();
    const guards = installNoExternalIoGuards('fetch-cli smoke tests');
    restoreNoExternalIo = guards.restore;
  });

  afterEach(() => {
    harness.restore();
    restoreNoExternalIo?.();
    restoreNoExternalIo = undefined;
  });

  it('fails fast with parse-time messaging when bbox arguments are incomplete', async () => {
    await expectExitCode(
      () =>
        parseFetchArgs([
          '--cityCode',
          'nyc',
          '--countryCode',
          'us',
          '--datasets',
          'counties',
          '--west',
          '-74.1',
          '--south',
          '40.6',
          '--east',
          '-73.7',
        ]),
      1,
      'Missing or invalid bbox arguments. Provide all four: --west --south --east --north',
      harness.calls.error,
    );
  });

  it('fails with validation messaging when parsed request has unsupported datasets', () => {
    const request = parseFetchArgs([
      '--cityCode',
      'nyc',
      '--countryCode',
      'us',
      '--datasets',
      'counties,invalid-dataset',
      '--west',
      '-74.1',
      '--south',
      '40.6',
      '--east',
      '-73.7',
      '--north',
      '40.9',
    ]);

    assert.throws(() => validateFetchRequest(request), {
      message:
        'Unsupported datasets for US: invalid-dataset. Allowed: counties, county-subdivisions, zctas',
    });
  });

  it('normalizes argv into a valid fetch request object for parse + validate flow', () => {
    const request = parseFetchArgs([
      '--cityCode',
      'lOn',
      '--countryCode',
      'gB',
      '--datasets',
      ' districts, wards ',
      '--west=-0.5',
      '--south=51.2',
      '--east=0.3',
      '--north=51.8',
      '--out',
      './tmp-output',
    ]);

    validateFetchRequest(request);

    assert.deepEqual(request, {
      cityCode: 'LON',
      countryCode: 'GB',
      datasets: ['districts', 'wards'],
      bbox: {
        west: -0.5,
        south: 51.2,
        east: 0.3,
        north: 51.8,
      },
      compress: true,
      out: './tmp-output',
    });
  });
});
