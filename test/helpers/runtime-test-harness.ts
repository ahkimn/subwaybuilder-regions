import assert from 'node:assert/strict';

export class ProcessExitInterceptedError extends Error {
  constructor(readonly code: number | undefined) {
    super(`process.exit intercepted with code ${String(code)}`);
    this.name = 'ProcessExitInterceptedError';
  }
}

export function withMockedProcessExit<T>(run: () => T): T {
  const originalExit = process.exit;

  const mockedExit = ((code?: number) => {
    throw new ProcessExitInterceptedError(code);
  }) as typeof process.exit;

  process.exit = mockedExit;
  try {
    return run();
  } finally {
    process.exit = originalExit;
  }
}

export async function withMockedProcessExitAsync<T>(run: () => Promise<T>): Promise<T> {
  const originalExit = process.exit;

  const mockedExit = ((code?: number) => {
    throw new ProcessExitInterceptedError(code);
  }) as typeof process.exit;

  process.exit = mockedExit;
  try {
    return await run();
  } finally {
    process.exit = originalExit;
  }
}

export function captureConsole(): {
  errors: string[];
  warns: string[];
  infos: string[];
  restore: () => void;
} {
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  const errors: string[] = [];
  const warns: string[] = [];
  const infos: string[] = [];

  console.error = (...args: unknown[]) => {
    errors.push(args.map((arg) => String(arg)).join(' '));
  };
  console.warn = (...args: unknown[]) => {
    warns.push(args.map((arg) => String(arg)).join(' '));
  };
  console.info = (...args: unknown[]) => {
    infos.push(args.map((arg) => String(arg)).join(' '));
  };

  return {
    errors,
    warns,
    infos,
    restore: () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    },
  };
}

export function assertProcessExitCode(error: unknown, expectedCode: number): void {
  assert.ok(error instanceof ProcessExitInterceptedError);
  assert.equal(error.code, expectedCode);
}
