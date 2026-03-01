import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { fetchJsonWithRetry } from '@scripts/utils/http';

describe('scripts/utils/http fetchJsonWithRetry', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns parsed JSON on first successful attempt', async () => {
    global.fetch = async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
      });

    const result = await fetchJsonWithRetry('https://example.com/test');

    assert.deepEqual(result, { ok: true });
  });

  it('retries transient status errors (429/5xx) then succeeds', async () => {
    let callCount = 0;
    const statuses = [429, 503];

    global.fetch = async () => {
      const status = statuses[callCount] ?? 200;
      callCount += 1;

      if (status === 200) {
        return new Response(JSON.stringify({ ok: true, attempts: callCount }), {
          status,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response('temporary error', {
        status,
        statusText:
          status === 429 ? 'Too Many Requests' : 'Service Unavailable',
        headers: { 'content-type': 'text/plain' },
      });
    };

    const result = await fetchJsonWithRetry(
      'https://example.com/retry-status',
      undefined,
      {
        maxRetries: 3,
        retryDelayMs: 1,
        label: 'TEST',
      },
    );

    assert.equal(callCount, 3);
    assert.deepEqual(result, { ok: true, attempts: 3 });
  });

  it('does not retry non-transient status and throws formatted error', async () => {
    let callCount = 0;

    global.fetch = async () => {
      callCount += 1;
      return new Response('bad request', {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'content-type': 'text/plain' },
      });
    };

    await assert.rejects(
      fetchJsonWithRetry('https://example.com/non-transient', undefined, {
        maxRetries: 4,
        retryDelayMs: 1,
        label: 'TEST',
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(
          error.message,
          /\[TEST\] GET https:\/\/example\.com\/non-transient failed on attempt 1\/5:/,
        );
        assert.match(
          error.message,
          /failed with status 400 Bad Request \(attempt 1\/5\)/,
        );
        return true;
      },
    );

    assert.equal(callCount, 1);
  });

  it('throws on non-JSON response and includes response snippet', async () => {
    const bodyPreview = '<html><body>upstream proxy error</body></html>';

    global.fetch = async () =>
      new Response(bodyPreview, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });

    await assert.rejects(
      fetchJsonWithRetry('https://example.com/non-json', undefined, {
        maxRetries: 0,
        label: 'TEST',
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(
          error.message,
          /returned non-JSON response \(text\/html\)/,
        );
        assert.match(
          error.message,
          /Body starts with: <html><body>upstream proxy error<\/body><\/html>/,
        );
        return true;
      },
    );
  });

  it('retries on network TypeError and then succeeds', async () => {
    let callCount = 0;

    global.fetch = async () => {
      callCount += 1;
      if (callCount < 3) {
        throw new TypeError('network down');
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const result = await fetchJsonWithRetry(
      'https://example.com/network-retry',
      undefined,
      {
        maxRetries: 3,
        retryDelayMs: 1,
        label: 'TEST',
      },
    );

    assert.equal(callCount, 3);
    assert.deepEqual(result, { ok: true });
  });

  it('retries on AbortError and eventually fails with attempt metadata', async () => {
    let callCount = 0;

    global.fetch = async () => {
      callCount += 1;
      const abortError = new Error('request aborted');
      abortError.name = 'AbortError';
      throw abortError;
    };

    await assert.rejects(
      fetchJsonWithRetry('https://example.com/abort-retry', undefined, {
        maxRetries: 2,
        retryDelayMs: 1,
        label: 'TEST',
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(
          error.message,
          /\[TEST\] GET https:\/\/example\.com\/abort-retry failed on attempt 3\/3:/,
        );
        assert.match(error.message, /request aborted/);
        return true;
      },
    );

    assert.equal(callCount, 3);
  });
});
