import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseNumber, requireString } from '../../../scripts/utils/cli';
import {
  assertProcessExitCode,
  captureConsole,
  withMockedProcessExit,
} from '../../helpers/runtime-test-harness';

describe('scripts/utils/cli', () => {
  const parseNumberCases: Array<{
    name: string;
    input: unknown;
    expected: number | undefined;
  }> = [
    {
      name: 'parseNumber_shouldReturnNumber_whenInputIsFiniteNumber',
      input: 12.5,
      expected: 12.5,
    },
    {
      name: 'parseNumber_shouldParseTrimmedNumberWithCommas_whenInputIsString',
      input: ' 1,234.5 ',
      expected: 1234.5,
    },
    {
      name: 'parseNumber_shouldReturnUndefined_whenInputIsInvalidString',
      input: 'abc',
      expected: undefined,
    },
  ];

  for (const testCase of parseNumberCases) {
    it(testCase.name, () => {
      assert.equal(parseNumber(testCase.input), testCase.expected);
    });
  }

  it('requireString_shouldExitWithCode1_whenValueIsMissing', () => {
    const logs = captureConsole();
    try {
      let thrown: unknown;

      try {
        withMockedProcessExit(() => requireString(undefined, 'cityCode'));
      } catch (error) {
        thrown = error;
      }

      assertProcessExitCode(thrown, 1);
      assert.equal(
        logs.errors.some((entry) => entry.includes('Missing or invalid argument: --cityCode')),
        true,
      );
    } finally {
      logs.restore();
    }
  });
});
