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
      'ITM',
      'IZO',
      'KCZ',
      'KFU',
      'KHS',
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
      'QFY',
      'QIS',
      'QNG',
      'QUT',
      'SDJ',
      'SHB',
      'SPK',
      'TAK',
      'TKS',
      'TOY',
      'TTJ',
      'UBJ',
      'UKB',
      'UKY',
      'WKJ',
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

describe('core/registry/static PL release city mapping', () => {
  it('resolves PL for hard-coded subwaybuilder-jp-data PL city codes', () => {
    for (const cityCode of [
      'BTK',
      'BZG',
      'CZE',
      'GDN',
      'IEG',
      'KIE',
      'KRK',
      'KTW',
      'LCJ',
      'LEG',
      'LUZ',
      'OPL',
      'POZ',
      'RDO',
      'RZE',
      'SLE',
      'SZY',
      'SZZ',
      'WAR',
      'WRO',
    ] as const) {
      assert.equal(
        resolveStaticTemplateCountry({ code: cityCode, country: undefined }),
        'PL',
        `Expected ${cityCode} to resolve to PL`,
      );
    }
  });
});

describe('core/registry/static CZ release city mapping', () => {
  it('resolves CZ for hard-coded subwaybuilder-jp-data CZ city codes', () => {
    for (const cityCode of [
      'BRQ',
      'CBS',
      'HKP',
      'JIH',
      'KVY',
      'LBC',
      'OLO',
      'OSR',
      'PLZ',
      'PRG',
      'UCH',
      'ZLN',
    ] as const) {
      assert.equal(
        resolveStaticTemplateCountry({ code: cityCode, country: undefined }),
        'CZ',
        `Expected ${cityCode} to resolve to CZ`,
      );
    }
  });
});

describe('core/registry/static TW release city mapping', () => {
  it('resolves TW for hard-coded subwaybuilder-tw-maps city codes', () => {
    for (const cityCode of [
      'TPE',
      'RMQ',
      'KHH',
      'TNN',
      'HSZ',
      'CYI',
    ] as const) {
      assert.equal(
        resolveStaticTemplateCountry({ code: cityCode, country: undefined }),
        'TW',
        `Expected ${cityCode} to resolve to TW`,
      );
    }
  });
});

describe('core/registry/static PE release city mapping', () => {
  it('resolves PE for hard-coded collaborator city codes', () => {
    for (const cityCode of [
      'LIM',
      'AQP',
      'TRU',
      'CIX',
      'PIU',
      'IQT',
      'CUZ',
      'CHM',
      'JAU',
    ] as const) {
      assert.equal(
        resolveStaticTemplateCountry({ code: cityCode, country: undefined }),
        'PE',
        `Expected ${cityCode} to resolve to PE`,
      );
    }
  });
});

describe('core/registry/static CN release city mapping', () => {
  it('resolves CN for hard-coded collaborator city codes', () => {
    for (const cityCode of [
      'SHA',
      'SZX',
      'CAN',
      'PEK',
      'CKG',
      'CTU',
    ] as const) {
      assert.equal(
        resolveStaticTemplateCountry({ code: cityCode, country: undefined }),
        'CN',
        `Expected ${cityCode} to resolve to CN`,
      );
    }
  });
});

describe('core/registry/static EE and UA release city mapping', () => {
  it('resolves all planned EE and UA city codes', () => {
    for (const cityCode of ['TLL', 'TAY', 'EPU', 'IDV']) {
      assert.equal(
        resolveStaticTemplateCountry({ code: cityCode, country: undefined }),
        'EE',
      );
    }
    for (const cityCode of ['LWO', 'ODS', 'KBP', 'HRK', 'DNK', 'OZH', 'KWG']) {
      assert.equal(
        resolveStaticTemplateCountry({ code: cityCode, country: undefined }),
        'UA',
      );
    }
  });
});

describe('core/registry/static LV and LT release city mapping', () => {
  it('resolves all planned LV and LT city codes', () => {
    for (const cityCode of ['RIX', 'DGV', 'LPX']) {
      assert.equal(
        resolveStaticTemplateCountry({ code: cityCode, country: undefined }),
        'LV',
      );
    }
    for (const cityCode of ['VNO', 'KUN', 'PLQ', 'PNV', 'SQQ']) {
      assert.equal(
        resolveStaticTemplateCountry({ code: cityCode, country: undefined }),
        'LT',
      );
    }
  });
});
