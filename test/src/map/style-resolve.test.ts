import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MapDisplayColor } from '@lib/ui/types/DisplayColor';
import { resolveEffectiveFill } from '@regions/map/style-resolve';

const FALLBACK: MapDisplayColor = {
  hex: '#264653',
  name: 'Deep Teal',
  hover: '#2F5F6E',
};

describe('map/style-resolve resolveEffectiveFill', () => {
  it('uses the palette fallback when there is no override', () => {
    assert.deepEqual(resolveEffectiveFill(undefined, FALLBACK), {
      base: '#264653',
      hover: '#2F5F6E',
    });
  });

  it('reuses fill for hover when only fill is overridden', () => {
    assert.deepEqual(resolveEffectiveFill({ fill: '#123456' }, FALLBACK), {
      base: '#123456',
      hover: '#123456',
    });
  });

  it('honours distinct fill and fillHover overrides', () => {
    assert.deepEqual(
      resolveEffectiveFill({ fill: '#123456', fillHover: '#abcdef' }, FALLBACK),
      { base: '#123456', hover: '#abcdef' },
    );
  });

  it('keeps the fallback base when only fillHover is overridden', () => {
    assert.deepEqual(resolveEffectiveFill({ fillHover: '#abcdef' }, FALLBACK), {
      base: '#264653',
      hover: '#abcdef',
    });
  });
});
