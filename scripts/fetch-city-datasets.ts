#!/usr/bin/env node
import { parseFetchArgs } from './fetch/parse-fetch-args';
import { runFetch } from './fetch/run-fetch';
import { validateFetchRequest } from './fetch/validate-fetch-request';

const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
} as const;

// Helper to provide color output to terminal
function colorize(value: string | number, color: keyof typeof ANSI): string {
  const text = String(value);
  if (!process.stdout.isTTY || process.env.NO_COLOR) {
    return text;
  }
  return `${ANSI[color]}${text}${ANSI.reset}`;
}

/**
 * Runtime-equivalent script to fetch and validate datasets for a city, based on:
 * - City/country codes (Rest of World is not supported)
 * - Dataset types (e.g. counties, districts, etc.)
 *   - Dataset sripts requiring locally stored boundaries (e.g. Provincial Electoral Districts in Canada) are not available as the user will not have the requisite file
 * - Explicit bbox boundaries (west, south, east, north)
 *
 * This script is intended to be run by developers to fetch datasets for a city, and can be used as a reference for how to structure fetch requests in other contexts (e.g. API endpoints).
 */
async function main(): Promise<void> {
  const request = parseFetchArgs();
  validateFetchRequest(request);

  const result = await runFetch(request);
  const successCount = result.successes.length;
  const failureCount = result.failures.length;

  console.log(
    `[Fetch] Completed for ${request.cityCode}. Success: ${colorize(successCount, 'green')}, Failed: ${colorize(failureCount, failureCount > 0 ? 'red' : 'dim')}`,
  );

  if (failureCount === 0) {
    console.log(
      colorize(
        '[Fetch] All requested datasets were generated successfully.',
        'green',
      ),
    );
  } else if (failureCount < request.datasets.length) {
    console.log(
      colorize(
        '[Fetch] Some datasets failed. Please review the failed datasets and retry.',
        'yellow',
      ),
    );
    console.log(
      `[Fetch] Failed dataset IDs: ${result.failures.map((failure) => failure.datasetId).join(', ')}`,
    );
  } else {
    console.log(
      colorize(
        '[Fetch] All requested datasets failed. Review the reported errors.',
        'red',
      ),
    );
  }

  console.log(
    colorize('[Fetch] It is now safe to close this terminal window.', 'dim'),
  );
}

void main().catch((error) => {
  console.error('[Fetch] Fatal error:', error);
  process.exit(1);
});
