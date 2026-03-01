import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  getBBoxFromArgs,
  hasExplicitBBox,
  parseExportArgs,
  parseNumber,
  requireNumber,
  requireString,
  toNonEmptyString,
  toPositiveInteger,
} from '@scripts/utils/cli';
import {
  expectExitCode,
} from '@test/helpers/script-test-harness';
import { withScriptHarness } from '@test/helpers/script-test-suite';

describe('scripts/utils/cli utilities', () => {
  const harness = withScriptHarness();
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('parseNumber_shouldReturnNumber_whenInputIsNumeric', () => {
    assert.equal(parseNumber(42), 42);
    assert.equal(parseNumber(-2.5), -2.5);
  });

  it('parseNumber_shouldParseCommaFormattedAndTrimmedStrings', () => {
    assert.equal(parseNumber('1,234,567'), 1234567);
    assert.equal(parseNumber('  98.5  '), 98.5);
  });

  it('parseNumber_shouldReturnUndefined_whenInputIsInvalid', () => {
    assert.equal(parseNumber('not-a-number'), undefined);
    assert.equal(parseNumber({}), undefined);
  });

  it('toNonEmptyString_shouldReturnTrimmedStringOrUndefined', () => {
    assert.equal(toNonEmptyString('  hello  '), 'hello');
    assert.equal(toNonEmptyString('   '), undefined);
    assert.equal(toNonEmptyString(10), undefined);
  });

  it('toPositiveInteger_shouldReturnPositiveIntegersOnly', () => {
    assert.equal(toPositiveInteger(5), 5);
    assert.equal(toPositiveInteger('42'), 42);
    assert.equal(toPositiveInteger('3.5'), undefined);
    assert.equal(toPositiveInteger(0), undefined);
    assert.equal(toPositiveInteger(-7), undefined);
  });

  it('hasExplicitBBox_shouldReturnTrue_onlyWhenAllCoordinatesAreFiniteNumbers', () => {
    assert.equal(
      hasExplicitBBox({ south: 1, west: 2, north: 3, east: 4 }),
      true,
    );

    assert.equal(
      hasExplicitBBox({ south: 1, west: 2, north: 3, east: Number.NaN }),
      false,
    );
    assert.equal(
      hasExplicitBBox({
        south: 1,
        west: 2,
        north: Number.POSITIVE_INFINITY,
        east: 4,
      }),
      false,
    );
    assert.equal(hasExplicitBBox({ south: 1, west: 2, north: 3 }), false);
  });

  it('getBBoxFromArgs_shouldReturnOrderedBoundaryBoxStructure', () => {
    const bbox = getBBoxFromArgs({
      south: -10,
      west: -20,
      north: 10,
      east: 20,
    });

    assert.deepEqual(bbox, {
      south: -10,
      west: -20,
      north: 10,
      east: 20,
    });
  });

  it('requireStringAndRequireNumber_shouldReturnValues_whenValid', () => {
    assert.equal(requireString('nyc', 'city-code'), 'nyc');
    assert.equal(requireNumber(15, 'preview-count', true), 15);
    assert.equal(requireNumber(-15, 'signed-number'), -15);
  });

  it('requireString_shouldExitWithCode1_whenValueIsMissingOrInvalid', async () => {
    await expectExitCode(
      () => requireString('', 'city-code'),
      1,
      'Missing or invalid argument: --city-code',
      harness.calls.error,
    );

    await expectExitCode(
      () => requireString(123 as unknown as string, 'city-code'),
      1,
      'Missing or invalid argument: --city-code',
      harness.calls.error,
    );
  });

  it('requireNumber_shouldExitWithCode1_whenValueIsMissingOrInvalidOrNotPositive', async () => {
    await expectExitCode(
      () => requireNumber(Number.NaN, 'preview-count'),
      1,
      'Missing or invalid argument: --preview-count',
      harness.calls.error,
    );

    await expectExitCode(
      () => requireNumber('42' as unknown as number, 'preview-count'),
      1,
      'Missing or invalid argument: --preview-count',
      harness.calls.error,
    );

    await expectExitCode(
      () => requireNumber(0, 'preview-count', true),
      1,
      'Missing or invalid argument: --preview-count. Expected a positive number.',
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
