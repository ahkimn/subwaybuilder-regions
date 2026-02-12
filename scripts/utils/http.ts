const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_RETRY_DELAY_MS = 500;

/**
 * Boilerplate helper class for fetch with retries, timeouts, and error handling.
 */
export type FetchJsonWithRetryOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  label?: string;
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

export async function fetchJsonWithRetry(
  url: string | URL,
  init: RequestInit = {},
  options: FetchJsonWithRetryOptions = {},
): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const label = options.label ?? 'HTTP';
  const method = (init.method ?? 'GET').toUpperCase();
  const requestUrl = typeof url === 'string' ? url : url.toString();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const attemptText = formatAttempt(attempt, maxRetries);
        const errorMessage = `[${label}] ${method} ${requestUrl} failed with status ${response.status} ${response.statusText} (attempt ${attemptText})`;

        if (attempt < maxRetries && isTransientStatus(response.status)) {
          const retryCount = attempt + 1;
          console.warn(
            `[${label}] retry ${retryCount}/${maxRetries} for ${method} ${requestUrl} after status ${response.status}`,
          );
          await sleep(retryDelayMs * 2 ** attempt);
          continue;
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (attempt < maxRetries && shouldRetryForError(error)) {
        const retryCount = attempt + 1;
        console.warn(
          `[${label}] retry ${retryCount}/${maxRetries} for ${method} ${requestUrl} after ${isAbortError(error) ? 'timeout/abort' : 'network error'}`,
        );
        await sleep(retryDelayMs * 2 ** attempt);
        continue;
      }

      const attemptText = formatAttempt(attempt, maxRetries);
      if (error instanceof Error) {
        throw new Error(
          `[${label}] ${method} ${requestUrl} failed on attempt ${attemptText}: ${error.message}`,
        );
      }

      throw new Error(
        `[${label}] ${method} ${requestUrl} failed on attempt ${attemptText}: ${String(error)}`,
      );
    }
  }

  throw new Error(
    `[${label}] ${method} ${requestUrl} failed after ${maxRetries + 1} attempts`,
  );
}
