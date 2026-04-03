import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveStaticTemplateCountry } from '@/core/registry/static';

describe('core/registry/static JP release city mapping', () => {
  it('resolves JP for hard-coded subwaybuilder-jp-maps city codes', () => {
    for (const cityCode of [
      'AKJ',
      'AOJ',
      'FKS',
      'FUK',
      'GAJ',
      'HKD',
      'HIJ',
      'ITM',
      'IZO',
      'UKB',
      'KCZ',
      'KIJ',
      'KKJ',
      'KMQ',
      'KOJ',
      'MYJ',
      'NGO',
      'NGS',
      'OKA',
      'OKJ',
      'QUT',
      'SDJ',
      'FSZ',
      'SPK',
      'TAK',
      'TOY',
      'UKY',
    ] as const) {
      assert.equal(
        resolveStaticTemplateCountry({ code: cityCode, country: undefined }),
        'JP',
        `Expected ${cityCode} to resolve to JP`,
      );
    }
  });

  it('aliases trailing-X codes to their three-letter base code', () => {
    assert.equal(
      resolveStaticTemplateCountry({ code: 'HIJX', country: undefined }),
      'JP',
    );
  });

  it('prefers the explicit city country when it is already recognized', () => {
    assert.equal(
      resolveStaticTemplateCountry({ code: 'HKD', country: 'JP' }),
      'JP',
    );
    assert.equal(
      resolveStaticTemplateCountry({ code: 'BOS', country: 'US' }),
      'US',
    );
  });
});
