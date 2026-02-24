#!/usr/bin/env node
import { parseFetchArgs } from './fetch/parse-fetch-args';
import { runFetch } from './fetch/run-fetch';
import { validateFetchRequest } from './fetch/validate-fetch-request';

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

  console.log(
    `[Fetch] Completed for ${request.cityCode}. Success: ${result.successes.length}, Failed: ${result.failures.length}`,
  );

  if (result.failures.length === request.datasets.length) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error('[Fetch] Fatal error:', error);
  process.exit(1);
});
