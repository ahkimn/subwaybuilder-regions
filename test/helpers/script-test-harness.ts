import assert from 'node:assert/strict';
import { format } from 'node:util';

export class ExitCalledError extends Error {
  readonly code: number;

  constructor(code: number) {
    super(`process.exit(${code}) called`);
    this.name = 'ExitCalledError';
    this.code = code;
  }
}

type ConsoleMethodName = 'error' | 'warn' | 'info';

type ConsoleCallMap = Record<ConsoleMethodName, string[]>;

type ConsoleOriginalMap = Record<
  ConsoleMethodName,
  (...args: unknown[]) => void
>;

export type ScriptTestHarness = {
  readonly calls: ConsoleCallMap;
  install: () => void;
  restore: () => void;
};

export function createScriptTestHarness(): ScriptTestHarness {
  const calls: ConsoleCallMap = {
    error: [],
    warn: [],
    info: [],
  };

  const originals: ConsoleOriginalMap = {
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  const originalExit = process.exit;
  let installed = false;

  function install() {
    calls.error.length = 0;
    calls.warn.length = 0;
    calls.info.length = 0;

    console.error = (...args: unknown[]) => {
      calls.error.push(format(...args));
    };
    console.warn = (...args: unknown[]) => {
      calls.warn.push(format(...args));
    };
    console.info = (...args: unknown[]) => {
      calls.info.push(format(...args));
    };

    process.exit = ((code?: number | string | null) => {
      throw new ExitCalledError(Number(code ?? 0));
    }) as typeof process.exit;

    installed = true;
  }

  function restore() {
    if (!installed) {
      return;
    }

    console.error = originals.error;
    console.warn = originals.warn;
    console.info = originals.info;
    process.exit = originalExit;
    installed = false;
  }

  return {
    calls,
    install,
    restore,
  };
}

export async function expectExitCode(
  fn: () => unknown | Promise<unknown>,
  expectedCode: number,
  expectedMessage?: string | RegExp,
  errorCalls: string[] = [],
): Promise<void> {
  try {
    await fn();
    assert.fail(`Expected process.exit(${expectedCode}) to be called.`);
  } catch (error) {
    assert.ok(error instanceof ExitCalledError, 'Expected ExitCalledError.');
    assert.equal(error.code, expectedCode);

    if (expectedMessage === undefined) {
      return;
    }

    const hasMessage =
      typeof expectedMessage === 'string'
        ? errorCalls.some((value) => value.includes(expectedMessage))
        : errorCalls.some((value) => expectedMessage.test(value));

    assert.equal(
      hasMessage,
      true,
      `Expected console.error output to include ${String(expectedMessage)}. Captured: ${errorCalls.join('\n')}`,
    );
  }
}
