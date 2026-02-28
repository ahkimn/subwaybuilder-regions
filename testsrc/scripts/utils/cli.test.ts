import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { parseExportArgs, requireNumber, requireString } from '../../../scripts/utils/cli';
import {
  createScriptTestHarness,
  expectExitCode,
} from '../../helpers/script-test-harness';

describe('scripts/utils/cli script behavior', () => {
  const harness = createScriptTestHarness();
  const originalArgv = process.argv;

  beforeEach(() => {
    harness.install();
  });

  afterEach(() => {
    harness.restore();
    process.argv = originalArgv;
  });

  it('requireString_shouldExitWithCode1_whenValueIsMissing', async () => {
    await expectExitCode(
      () => requireString(undefined, 'city-code'),
      1,
      'Missing or invalid argument: --city-code',
      harness.calls.error,
    );
  });

  it('requireNumber_shouldExitWithCode1_whenPositiveIsRequiredAndValueIsNotPositive', async () => {
    await expectExitCode(
      () => requireNumber(0, 'preview-count', true),
      1,
      /Expected a positive number/,
      harness.calls.error,
    );
  });

  it('parseExportArgs_shouldExitWithCode1_whenAllAndCityCodeAreMissing', async () => {
    process.argv = ['node', 'script.ts'];

    await expectExitCode(
      () => parseExportArgs(),
      1,
      '--city-code (or pass --all to export all cities in boundaries.csv)',
      harness.calls.error,
    );
  });

  it('parseExportArgs_shouldParseOutputDirAndCityCodes_whenValid', () => {
    process.argv = [
      'node',
      'script.ts',
      '--city-code',
      'nyc, sf',
      '--output-dir',
      'archives',
      '--include-osm-data',
    ];

    const args = parseExportArgs();

    assert.deepEqual(args, {
      all: false,
      cityCodes: ['NYC', 'SF'],
      includeOSMData: true,
      outputDir: 'archives',
    });
    assert.equal(harness.calls.error.length, 0);
  });
});
