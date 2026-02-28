import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLocalDatasetCandidatePaths,
  buildLocalDatasetPath,
  resolveRuntimePlatform,
} from '../../../src/core/storage/helpers';

describe('core/storage/helpers', () => {
  it('buildLocalDatasetPath_shouldBuildGeoJsonPath_whenExtensionDefaults', () => {
    const result = buildLocalDatasetPath('mods/regions/data', 'NYC', 'counties');
    assert.equal(
      result,
      'file:///mods/regions/data/NYC/counties.geojson',
    );
  });

  it('buildLocalDatasetCandidatePaths_shouldPreferCompressedPath_whenBuildingCandidates', () => {
    const [first, second] = buildLocalDatasetCandidatePaths(
      'mods/regions/data',
      'NYC',
      'counties',
    );

    assert.equal(first.endsWith('.geojson.gz'), true);
    assert.equal(second.endsWith('.geojson'), true);
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
      value: { navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' } },
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
