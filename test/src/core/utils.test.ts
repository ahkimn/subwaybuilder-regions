import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatNumberOrDefault,
  formatPercentOrDefault,
  isObjectRecord,
  processInChunks,
} from '@/core/utils';

describe('core/utils', () => {
  it('isObjectRecord_shouldReturnTrue_whenValueIsPlainObject', () => {
    assert.equal(isObjectRecord({ a: 1 }), true);
  });

  it('isObjectRecord_shouldReturnFalse_whenValueIsNull', () => {
    assert.equal(isObjectRecord(null), false);
  });

  it('formatNumberOrDefault_shouldReturnFallback_whenValueIsNull', () => {
    assert.equal(formatNumberOrDefault(null, 0, 'N/A'), 'N/A');
  });

  it('formatPercentOrDefault_shouldAppendPercent_whenValueExists', () => {
    assert.equal(formatPercentOrDefault(12.345, 1, 'N/A'), '12.3%');
  });

  it('processInChunks_shouldYieldAtChunkBoundaries_whenChunkSizeIsReached', async () => {
    const values = [1, 2, 3, 4, 5];
    const handled: number[] = [];
    let yieldCount = 0;

    await processInChunks(
      values,
      2,
      (item) => {
        handled.push(item);
      },
      async () => {
        yieldCount += 1;
      },
    );

    assert.deepEqual(handled, values);
    assert.equal(yieldCount, 2);
  });

  it('processInChunks_shouldStopEarly_whenHandlerReturnsFalse', async () => {
    const handled: number[] = [];

    await processInChunks([10, 20, 30], 1, (item) => {
      handled.push(item);
      return item !== 20;
    });

    assert.deepEqual(handled, [10, 20]);
  });
});
