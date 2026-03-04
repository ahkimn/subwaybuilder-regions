const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_RETRY_DELAY_MS = 500;

/**
 * Boilerplate helper class for fetch with retries, timeouts, and error handling.
 */
export type FetchWithRetryOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  label?: string;
};

type ResolvedFetchWithRetryOptions = {
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  label: string;
};

type FetchContext = {
  method: string;
  requestUrl: string;
  options: ResolvedFetchWithRetryOptions;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function shouldRetryForError(error: unknown): boolean {
  return isAbortError(error) || error instanceof TypeError;
}

function formatAttempt(attempt: number, maxRetries: number): string {
  return `${attempt + 1}/${maxRetries + 1}`;
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }

  const normalizedContentType = contentType.toLowerCase();
  return (
    normalizedContentType.includes('application/json') ||
    normalizedContentType.includes('+json')
  );
}

function resolveFetchOptions(
  options: FetchWithRetryOptions,
): ResolvedFetchWithRetryOptions {
  return {
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelayMs: options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    label: options.label ?? 'HTTP',
  };
}

async function executeFetchWithRetry<T>(
  url: string | URL,
  init: RequestInit,
  options: FetchWithRetryOptions,
  parseResponse: (response: Response, context: FetchContext) => Promise<T>,
): Promise<T> {
  const resolvedOptions = resolveFetchOptions(options);
  const method = (init.method ?? 'GET').toUpperCase();
  const requestUrl = typeof url === 'string' ? url : url.toString();
  const context: FetchContext = {
    method,
    requestUrl,
    options: resolvedOptions,
  };

  for (let attempt = 0; attempt <= resolvedOptions.maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      resolvedOptions.timeoutMs,
    );
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const attemptText = formatAttempt(attempt, resolvedOptions.maxRetries);
        const errorMessage = `[${resolvedOptions.label}] ${method} ${requestUrl} failed with status ${response.status} ${response.statusText} (attempt ${attemptText})`;

        if (
          attempt < resolvedOptions.maxRetries &&
          isTransientStatus(response.status)
        ) {
          const retryCount = attempt + 1;
          console.warn(
            `[${resolvedOptions.label}] retry ${retryCount}/${resolvedOptions.maxRetries} for ${method} ${requestUrl} after status ${response.status}`,
          );
          await sleep(resolvedOptions.retryDelayMs * 2 ** attempt);
          continue;
        }

        throw new Error(errorMessage);
      }

      return await parseResponse(response, context);
    } catch (error) {
      clearTimeout(timeoutId);

      if (attempt < resolvedOptions.maxRetries && shouldRetryForError(error)) {
        const retryCount = attempt + 1;
        console.warn(
          `[${resolvedOptions.label}] retry ${retryCount}/${resolvedOptions.maxRetries} for ${method} ${requestUrl} after ${isAbortError(error) ? 'timeout/abort' : 'network error'}`,
        );
        await sleep(resolvedOptions.retryDelayMs * 2 ** attempt);
        continue;
      }

      const attemptText = formatAttempt(attempt, resolvedOptions.maxRetries);
      if (error instanceof Error) {
        throw new Error(
          `[${resolvedOptions.label}] ${method} ${requestUrl} failed on attempt ${attemptText}: ${error.message}`,
        );
      }

      throw new Error(
        `[${resolvedOptions.label}] ${method} ${requestUrl} failed on attempt ${attemptText}: ${String(error)}`,
      );
    }
  }

  throw new Error(
    `[${resolvedOptions.label}] ${method} ${requestUrl} failed after ${resolvedOptions.maxRetries + 1} attempts`,
  );
}

export async function fetchJsonWithRetry(
  url: string | URL,
  init: RequestInit = {},
  options: FetchWithRetryOptions = {},
): Promise<unknown> {
  return executeFetchWithRetry(
    url,
    init,
    options,
    async (response, context) => {
      const responseContentType = response.headers.get('content-type');
      if (!isJsonContentType(responseContentType)) {
        // Some queries may return non-JSON error responses (e.g. HTML error pages). If this occurs, we want to capture part of the response body.
        const responseText = await response.text();
        const responseSnippet = responseText.slice(0, 180).replace(/\s+/g, ' ');
        throw new Error(
          `[${context.options.label}] ${context.method} ${context.requestUrl} returned non-JSON response (${responseContentType ?? 'unknown content-type'}). Body starts with: ${responseSnippet}`,
        );
      }

      return response.json();
    },
  );
}

export async function fetchBytesWithRetry(
  url: string | URL,
  init: RequestInit = {},
  options: FetchWithRetryOptions = {},
): Promise<Buffer> {
  return executeFetchWithRetry(url, init, options, async (response) =>
    Buffer.from(await response.arrayBuffer()),
  );
}
