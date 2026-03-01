import assert from 'node:assert/strict';
import fs from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { installNoExternalIoGuards } from './no-external-io';

describe('installNoExternalIoGuards', () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('blocks both sync and async fs writes while installed', async () => {
    const guards = installNoExternalIoGuards('guard helper test');
    restore = guards.restore;

    assert.throws(() => fs.writeFileSync('/tmp/no-external-io-sync.txt', 'x'), {
      message: 'Unexpected file call in guard helper test',
    });

    await assert.rejects(
      fs.promises.writeFile('/tmp/no-external-io-async.txt', 'x'),
      {
        message: 'Unexpected file call in guard helper test',
      },
    );
  });

  it('restores original fs methods after cleanup', async () => {
    const testFilePath = `/tmp/no-external-io-restore-${Date.now()}.txt`;

    const guards = installNoExternalIoGuards('restore helper test');
    guards.restore();

    await fs.promises.writeFile(testFilePath, 'ok');

    const contents = await fs.promises.readFile(testFilePath, 'utf8');
    assert.equal(contents, 'ok');

    await fs.promises.unlink(testFilePath);
  });
});
