import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { gzipSync } from 'node:zlib';

import { loadRemoteGeoJSON } from '@scripts/utils/remote-data';

type FetchType = typeof globalThis.fetch;

function createFeatureCollection(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

describe('scripts/utils/remote-data', () => {
  it('loads remote gzip GeoJSON payloads', async () => {
    const originalFetch = globalThis.fetch;
    const gzippedPayload = gzipSync(JSON.stringify(createFeatureCollection()));

    globalThis.fetch = (async () =>
      new Response(gzippedPayload, {
        status: 200,
      })) as FetchType;

    try {
      const loaded = await loadRemoteGeoJSON(
        'https://example.com/test.geojson.gz',
      );
      assert.equal(loaded.type, 'FeatureCollection');
      assert.deepEqual(loaded.features, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('loads gzip payloads detected by magic bytes', async () => {
    const originalFetch = globalThis.fetch;
    const gzippedPayload = gzipSync(JSON.stringify(createFeatureCollection()));

    globalThis.fetch = (async () =>
      new Response(gzippedPayload, {
        status: 200,
      })) as FetchType;

    try {
      const loaded = await loadRemoteGeoJSON('https://example.com/test.bin');
      assert.equal(loaded.type, 'FeatureCollection');
      assert.deepEqual(loaded.features, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws when payload is not a feature collection', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ type: 'Point', coordinates: [0, 0] }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      })) as FetchType;

    try {
      await assert.rejects(
        () => loadRemoteGeoJSON('https://example.com/not-feature-collection'),
        /Expected FeatureCollection/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws when payload cannot be parsed as JSON', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response('not-json', {
        status: 200,
      })) as FetchType;

    try {
      await assert.rejects(
        () => loadRemoteGeoJSON('https://example.com/invalid-json'),
        /Failed to parse JSON payload/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws when .gz payload is not actually gzip-compressed', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response('plain-text', {
        status: 200,
      })) as FetchType;

    try {
      await assert.rejects(
        () => loadRemoteGeoJSON('https://example.com/not-gzip.geojson.gz'),
        /Failed to decompress gzip payload/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
