import fs from 'node:fs';

export type NoExternalIoGuards = {
  restore: () => void;
};

function makeIoError(kind: 'network' | 'file', contextLabel: string): Error {
  return new Error(`Unexpected ${kind} call in ${contextLabel}`);
}

function createThrowingFsMethod(contextLabel: string) {
  return (...args: unknown[]) => {
    const maybeCallback = args.at(-1);
    const error = makeIoError('file', contextLabel);

    if (typeof maybeCallback === 'function') {
      (maybeCallback as (error: Error) => void)(error);
      return;
    }

    throw error;
  };
}

export function installNoExternalIoGuards(
  contextLabel: string,
): NoExternalIoGuards {
  const originalFetch = globalThis.fetch;

  const originalFsMethods = {
    writeFileSync: fs.writeFileSync,
    writeFile: fs.writeFile,
    appendFileSync: fs.appendFileSync,
    appendFile: fs.appendFile,
    mkdirSync: fs.mkdirSync,
    mkdir: fs.mkdir,
    copyFileSync: fs.copyFileSync,
    copyFile: fs.copyFile,
    renameSync: fs.renameSync,
    rename: fs.rename,
    unlinkSync: fs.unlinkSync,
    unlink: fs.unlink,
    rmSync: fs.rmSync,
    rm: fs.rm,
    rmdirSync: fs.rmdirSync,
    rmdir: fs.rmdir,
  };

  const originalFsPromises = {
    writeFile: fs.promises.writeFile,
    appendFile: fs.promises.appendFile,
    mkdir: fs.promises.mkdir,
    copyFile: fs.promises.copyFile,
    rename: fs.promises.rename,
    unlink: fs.promises.unlink,
    rm: fs.promises.rm,
    rmdir: fs.promises.rmdir,
  };

  const throwingFsMethod = createThrowingFsMethod(contextLabel);
  const throwingFsPromiseMethod = async () => {
    throw makeIoError('file', contextLabel);
  };

  globalThis.fetch = (async () => {
    throw makeIoError('network', contextLabel);
  }) as typeof fetch;

  fs.writeFileSync = throwingFsMethod as typeof fs.writeFileSync;
  fs.writeFile = throwingFsMethod as typeof fs.writeFile;
  fs.appendFileSync = throwingFsMethod as typeof fs.appendFileSync;
  fs.appendFile = throwingFsMethod as typeof fs.appendFile;
  fs.mkdirSync = throwingFsMethod as typeof fs.mkdirSync;
  fs.mkdir = throwingFsMethod as typeof fs.mkdir;
  fs.copyFileSync = throwingFsMethod as typeof fs.copyFileSync;
  fs.copyFile = throwingFsMethod as typeof fs.copyFile;
  fs.renameSync = throwingFsMethod as typeof fs.renameSync;
  fs.rename = throwingFsMethod as typeof fs.rename;
  fs.unlinkSync = throwingFsMethod as typeof fs.unlinkSync;
  fs.unlink = throwingFsMethod as typeof fs.unlink;
  fs.rmSync = throwingFsMethod as typeof fs.rmSync;
  fs.rm = throwingFsMethod as typeof fs.rm;
  fs.rmdirSync = throwingFsMethod as typeof fs.rmdirSync;
  fs.rmdir = throwingFsMethod as typeof fs.rmdir;

  fs.promises.writeFile =
    throwingFsPromiseMethod as typeof fs.promises.writeFile;
  fs.promises.appendFile =
    throwingFsPromiseMethod as typeof fs.promises.appendFile;
  fs.promises.mkdir = throwingFsPromiseMethod as typeof fs.promises.mkdir;
  fs.promises.copyFile = throwingFsPromiseMethod as typeof fs.promises.copyFile;
  fs.promises.rename = throwingFsPromiseMethod as typeof fs.promises.rename;
  fs.promises.unlink = throwingFsPromiseMethod as typeof fs.promises.unlink;
  fs.promises.rm = throwingFsPromiseMethod as typeof fs.promises.rm;
  fs.promises.rmdir = throwingFsPromiseMethod as typeof fs.promises.rmdir;

  return {
    restore: () => {
      globalThis.fetch = originalFetch;

      fs.writeFileSync = originalFsMethods.writeFileSync;
      fs.writeFile = originalFsMethods.writeFile;
      fs.appendFileSync = originalFsMethods.appendFileSync;
      fs.appendFile = originalFsMethods.appendFile;
      fs.mkdirSync = originalFsMethods.mkdirSync;
      fs.mkdir = originalFsMethods.mkdir;
      fs.copyFileSync = originalFsMethods.copyFileSync;
      fs.copyFile = originalFsMethods.copyFile;
      fs.renameSync = originalFsMethods.renameSync;
      fs.rename = originalFsMethods.rename;
      fs.unlinkSync = originalFsMethods.unlinkSync;
      fs.unlink = originalFsMethods.unlink;
      fs.rmSync = originalFsMethods.rmSync;
      fs.rm = originalFsMethods.rm;
      fs.rmdirSync = originalFsMethods.rmdirSync;
      fs.rmdir = originalFsMethods.rmdir;

      fs.promises.writeFile = originalFsPromises.writeFile;
      fs.promises.appendFile = originalFsPromises.appendFile;
      fs.promises.mkdir = originalFsPromises.mkdir;
      fs.promises.copyFile = originalFsPromises.copyFile;
      fs.promises.rename = originalFsPromises.rename;
      fs.promises.unlink = originalFsPromises.unlink;
      fs.promises.rm = originalFsPromises.rm;
      fs.promises.rmdir = originalFsPromises.rmdir;
    },
  };
}
