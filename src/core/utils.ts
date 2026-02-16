import { PERCENT_DECIMALS, UNKNOWN_VALUE_DISPLAY } from './constants';

export function formatFixedNumber(
  n: number,
  decimals: number = 0,
  locale: string = 'en-US',
): string {
  return n.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatNumberOrDefault(
  value: number | null,
  decimals = 0,
  fallback = UNKNOWN_VALUE_DISPLAY,
): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  return formatFixedNumber(value, decimals);
}

export function formatPercentOrDefault(
  value: number | null,
  decimals = PERCENT_DECIMALS,
  fallback = UNKNOWN_VALUE_DISPLAY,
): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  return `${formatFixedNumber(value, decimals)}%`;
}

export async function fetchGeoJSON(
  dataPath: string,
): Promise<GeoJSON.FeatureCollection> {
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch GeoJSON from ${dataPath}: ${response.statusText}`,
    );
  }

  const raw = await response.text();
  try {
    return JSON.parse(raw) as GeoJSON.FeatureCollection;
  } catch (error) {
    const preview = raw.slice(0, 180).replace(/\s+/g, ' ');
    throw new Error(
      `Failed to parse GeoJSON from ${dataPath}. Preview: ${preview}. Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function processInChunks<T>(
  items: T[],
  chunkSize: number,
  handler: (item: T, index: number) => void | boolean | Promise<void | boolean>,
  yieldFunction: () => Promise<void> = yieldToEventLoop,
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const result = await handler(items[i], i);
    // Return false from the handler to stop processing early.
    if (result === false) {
      return;
    }
    if ((i + 1) % chunkSize === 0) {
      await yieldFunction();
    }
  }
}
