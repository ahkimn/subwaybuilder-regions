import { afterEach, beforeEach } from 'node:test';

import { installNoExternalIoGuards } from './no-external-io';
import {
  createScriptTestHarness,
  type ScriptTestHarness,
} from './script-test-harness';

type ScriptHarnessOptions = {
  noExternalIoContextLabel?: string;
};

export function withScriptHarness(
  options: ScriptHarnessOptions = {},
): ScriptTestHarness {
  const harness = createScriptTestHarness();
  let restoreNoExternalIo: (() => void) | undefined;

  beforeEach(() => {
    harness.install();

    if (options.noExternalIoContextLabel !== undefined) {
      restoreNoExternalIo = installNoExternalIoGuards(
        options.noExternalIoContextLabel,
      ).restore;
    }
  });

  afterEach(() => {
    harness.restore();
    restoreNoExternalIo?.();
    restoreNoExternalIo = undefined;
  });

  return harness;
}
