import fs from 'node:fs';

export type NoExternalIoGuards = {
  restore: () => void;
};

export function installNoExternalIoGuards(contextLabel: string): NoExternalIoGuards {
  const originalFetch = globalThis.fetch;
  const originalWriteFileSync = fs.writeFileSync;

  globalThis.fetch = (async () => {
    throw new Error(`Unexpected network call in ${contextLabel}`);
  }) as typeof fetch;

  fs.writeFileSync = (() => {
    throw new Error(`Unexpected file write in ${contextLabel}`);
  }) as typeof fs.writeFileSync;

  return {
    restore: () => {
      globalThis.fetch = originalFetch;
      fs.writeFileSync = originalWriteFileSync;
    },
  };
}
