import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { parseFetchArgs } from '../../../scripts/fetch/parse-fetch-args';
import {
  createScriptTestHarness,
  expectExitCode,
} from '../../helpers/script-test-harness';

describe('scripts/fetch/parse-fetch-args script behavior', () => {
  const harness = createScriptTestHarness();

  beforeEach(() => {
    harness.install();
  });

  afterEach(() => {
    harness.restore();
  });

  it('shouldParseAllRequiredArgs_whenHappyPath', () => {
    const args = parseFetchArgs([
      '--cityCode',
      'nyc',
      '--countryCode',
      'us',
      '--datasets',
      'subway-stops,railways',
      '--west',
      '-74.1',
      '--south',
      '40.6',
      '--east',
      '-73.7',
      '--north',
      '40.9',
      '--compress',
      '--out',
      './custom-output',
    ]);

    assert.deepEqual(args, {
      cityCode: 'NYC',
      countryCode: 'US',
      datasets: ['subway-stops', 'railways'],
      bbox: {
        west: -74.1,
        south: 40.6,
        east: -73.7,
        north: 40.9,
      },
      compress: true,
      out: './custom-output',
    });
    assert.equal(harness.calls.error.length, 0);
  });

  it('shouldParseNegativeBbox_whenUsingEqualsStyleArgs', () => {
    const args = parseFetchArgs([
      '--cityCode',
      'nyc',
      '--countryCode',
      'us',
      '--datasets',
      'subway-stops',
      '--west=-74.1',
      '--south=40.6',
      '--east=-73.7',
      '--north=40.9',
    ]);

    assert.deepEqual(args.bbox, {
      west: -74.1,
      south: 40.6,
      east: -73.7,
      north: 40.9,
    });
    assert.equal(harness.calls.error.length, 0);
  });

  it('shouldParseNegativeBbox_whenUsingSpaceSeparatedArgs', () => {
    const args = parseFetchArgs([
      '--cityCode',
      'nyc',
      '--countryCode',
      'us',
      '--datasets',
      'subway-stops',
      '--west',
      '-74.1',
      '--south',
      '40.6',
      '--east',
      '-73.7',
      '--north',
      '40.9',
    ]);

    assert.deepEqual(args.bbox, {
      west: -74.1,
      south: 40.6,
      east: -73.7,
      north: 40.9,
    });
    assert.equal(harness.calls.error.length, 0);
  });

  it('shouldTrimAndFilterDatasets_whenParsingDatasetsArg', () => {
    const args = parseFetchArgs([
      '--cityCode',
      'nyc',
      '--countryCode',
      'us',
      '--datasets',
      ' subway-stops, , railways ,, bus-routes  ',
      '--west',
      '-74.1',
      '--south',
      '40.6',
      '--east',
      '-73.7',
      '--north',
      '40.9',
    ]);

    assert.deepEqual(args.datasets, ['subway-stops', 'railways', 'bus-routes']);
    assert.equal(harness.calls.error.length, 0);
  });

  it('shouldUppercaseCityAndCountryCodes_whenParsed', () => {
    const args = parseFetchArgs([
      '--cityCode',
      'lOn',
      '--countryCode',
      'gB',
      '--datasets',
      'subway-stops',
      '--west',
      '-0.5',
      '--south',
      '51.2',
      '--east',
      '0.3',
      '--north',
      '51.8',
    ]);

    assert.equal(args.cityCode, 'LON');
    assert.equal(args.countryCode, 'GB');
    assert.equal(harness.calls.error.length, 0);
  });

  it('shouldExitWithCode1_whenBboxIsMissingFields', async () => {
    await expectExitCode(
      () =>
        parseFetchArgs([
          '--cityCode',
          'nyc',
          '--countryCode',
          'us',
          '--datasets',
          'subway-stops',
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

  it('shouldUseDefaultCompressAndOut_whenOmitted', () => {
    const args = parseFetchArgs([
      '--cityCode',
      'nyc',
      '--countryCode',
      'us',
      '--datasets',
      'subway-stops',
      '--west',
      '-74.1',
      '--south',
      '40.6',
      '--east',
      '-73.7',
      '--north',
      '40.9',
    ]);

    assert.equal(args.compress, true);
    assert.equal(args.out, './data');
    assert.equal(harness.calls.error.length, 0);
  });
});
