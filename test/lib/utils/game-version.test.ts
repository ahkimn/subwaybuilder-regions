import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isVersionAtLeast, type SemVer } from '@lib/utils/game-version';

const V140: SemVer = [1, 4, 0];

describe('lib/utils/game-version isVersionAtLeast', () => {
  it('gates at v1.4.0', () => {
    for (const version of ['1.4.0', '1.4.1', '1.5.0', '2.0.0', '1.10.0']) {
      assert.equal(isVersionAtLeast(version, V140), true, version);
    }
    for (const version of ['1.3.9', '1.3.10', '1.0.0', '0.9.9']) {
      assert.equal(isVersionAtLeast(version, V140), false, version);
    }
  });

  it('compares numerically, not lexically', () => {
    assert.equal(isVersionAtLeast('1.4.10', [1, 4, 2]), true);
    assert.equal(isVersionAtLeast('1.4.2', [1, 4, 10]), false);
  });

  it('tolerates a leading v / surrounding text and rejects unparseable input', () => {
    assert.equal(isVersionAtLeast('v1.4.0', V140), true);
    assert.equal(isVersionAtLeast('game 1.4.0 (build)', V140), true);
    assert.equal(isVersionAtLeast('not-a-version', V140), false);
    assert.equal(isVersionAtLeast('', V140), false);
  });
});
