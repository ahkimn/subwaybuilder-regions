import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveStaticTemplateCountry } from '@regions/core/registry/static';

describe('core/registry/static JP release city mapping', () => {
  it('resolves JP for hard-coded subwaybuilder-jp-maps city codes', () => {
    for (const cityCode of [
      'AKJ',
      'AOJ',
      'AXT',
      'FKJ',
      'FKS',
      'FOKK',
      'FSZ',
      'FUK',
      'GAJ',
      'HIJ',
      'HKD',
      'HNA',
      'HSG',
      'ITM',
      'IZO',
      'KCZ',
      'KIJ',
      'KMI',
      'KKJ',
      'KMJ',
      'KMQ',
      'KOJ',
      'MMJ',
      'MYJ',
      'NGO',
      'NGS',
      'OIT',
      'OKA',
      'OKJ',
      'QEB',
      'QFY',
      'QIS',
      'QNG',
      'QUT',
      'SDJ',
      'SKK',
      'SPK',
      'TAK',
      'TKS',
      'TOY',
      'TTJ',
      'UKB',
      'UKY',
      'WKY',
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

describe('core/registry/static CZ release city mapping', () => {
  it('resolves CZ for hard-coded subwaybuilder-jp-data CZ city codes', () => {
    for (const cityCode of [
      'BRQ',
      'HKP',
      'OLO',
      'OSR',
      'PLZ',
      'PRG',
      'UCH',
    ] as const) {
      assert.equal(
        resolveStaticTemplateCountry({ code: cityCode, country: undefined }),
        'CZ',
        `Expected ${cityCode} to resolve to CZ`,
      );
    }
  });
});
