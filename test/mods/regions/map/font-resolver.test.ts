import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  __resetLabelFontCacheForTests,
  glyphResourceUrl,
  LABEL_FONT_CANDIDATES,
  resolveLabelFont,
} from '@regions/map/font-resolver';

afterEach(() => __resetLabelFontCacheForTests());

describe('font-resolver glyphResourceUrl', () => {
  it('encodes the font name into the map:// glyph path', () => {
    assert.equal(
      glyphResourceUrl('Noto Sans Medium'),
      'map://_fonts/Noto%20Sans%20Medium/0-255.pbf',
    );
  });
});

describe('resolveLabelFont', () => {
  it('returns the first candidate whose glyphs resolve, probing one at a time', async () => {
    const tried: string[] = [];
    const font = await resolveLabelFont(['A', 'B', 'C'], async (candidate) => {
      tried.push(candidate);
      return candidate === 'B';
    });
    assert.equal(font, 'B');
    // Stops at the first success — never probes 'C'.
    assert.deepEqual(tried, ['A', 'B']);
  });

  it('falls back to the first candidate when none resolve', async () => {
    const font = await resolveLabelFont(['X', 'Y'], async () => false);
    assert.equal(font, 'X');
  });

  it('caches the resolved font (probes only once across calls)', async () => {
    let probeCount = 0;
    const probe = async (candidate: string): Promise<boolean> => {
      probeCount += 1;
      return candidate === 'A';
    };
    assert.equal(await resolveLabelFont(['A', 'B'], probe), 'A');
    assert.equal(await resolveLabelFont(['A', 'B'], probe), 'A');
    assert.equal(probeCount, 1);
  });

  it('prefers Noto Sans Medium (the game-served font) first', () => {
    assert.equal(LABEL_FONT_CANDIDATES[0], 'Noto Sans Medium');
  });
});
