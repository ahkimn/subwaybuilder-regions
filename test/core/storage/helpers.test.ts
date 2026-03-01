import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  buildLocalDatasetCandidatePaths,
  buildLocalDatasetPath,
  getFeatureCountForLocalDataset,
  resolveRuntimePlatform,
  tryDatasetPath,
  tryLocalDatasetPaths,
} from '../../../src/core/storage/helpers';

describe('core/storage/helpers', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const pathCases: Array<{
    name: string;
    extension: '.geojson' | '.geojson.gz';
    expectedSuffix: string;
  }> = [
    {
      name: 'buildLocalDatasetPath_shouldBuildGeoJsonPath_whenExtensionIsGeoJson',
      extension: '.geojson',
      expectedSuffix: '/NYC/counties.geojson',
    },
    {
      name: 'buildLocalDatasetPath_shouldBuildGzipPath_whenExtensionIsGeoJsonGzip',
      extension: '.geojson.gz',
      expectedSuffix: '/NYC/counties.geojson.gz',
    },
  ];

  for (const testCase of pathCases) {
    it(testCase.name, () => {
      const result = buildLocalDatasetPath(
        'mods/regions/data',
        'NYC',
        'counties',
        testCase.extension,
      );
      assert.equal(result.endsWith(testCase.expectedSuffix), true);
    });
  }

  it('buildLocalDatasetCandidatePaths_shouldPreferCompressedPath_whenBuildingCandidates', () => {
    const [first, second] = buildLocalDatasetCandidatePaths(
      'mods/regions/data',
      'NYC',
      'counties',
    );

    assert.equal(first.endsWith('.geojson.gz'), true);
    assert.equal(second.endsWith('.geojson'), true);
  });

  it('tryDatasetPath_shouldReturnPresentTrue_whenFetchOk', async () => {
    globalThis.fetch = (async () =>
      new Response('x'.repeat(2048), {
        status: 200,
        headers: { 'content-length': '2048' },
      })) as typeof fetch;

    const result = await tryDatasetPath('file:///data/test.geojson.gz');
    assert.equal(result.isPresent, true);
    assert.equal(result.compressed, true);
    assert.equal(typeof result.fileSizeMB, 'number');
  });

  it('tryLocalDatasetPaths_shouldReturnFirstPresentPath_whenAnyPathExists', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith('.geojson.gz')) {
        return new Response('', { status: 404 });
      }
      return new Response('ok', { status: 200 });
    }) as typeof fetch;

    const result = await tryLocalDatasetPaths([
      'file:///data/test.geojson.gz',
      'file:///data/test.geojson',
    ]);

    assert.equal(result.isPresent, true);
    assert.equal(result.dataPath.endsWith('.geojson'), true);
  });

  it('getFeatureCountForLocalDataset_shouldReturnFeatureCount_whenGeoJsonIsValid', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: null, properties: {} }],
        }),
        { status: 200 },
      )) as typeof fetch;

    const count = await getFeatureCountForLocalDataset('file:///data/test.geojson');
    assert.equal(count, 1);
  });

  it('resolveRuntimePlatform_shouldReturnExplicitPlatform_whenProvided', () => {
    const result = resolveRuntimePlatform({
      totalRAMGB: 16,
      cpuCores: 4,
      heapSizeMB: 512,
      platform: 'win32',
      arch: 'x64',
    });

    assert.equal(result, 'win32');
  });

  it('resolveRuntimePlatform_shouldInferPlatformFromUserAgent_whenPerformanceInfoIsNull', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: {
        navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' },
      },
      configurable: true,
      writable: true,
    });

    try {
      assert.equal(resolveRuntimePlatform(null), 'darwin');
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    }
  });
});
