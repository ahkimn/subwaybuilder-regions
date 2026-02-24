#!/usr/bin/env node
import { parseFetchArgs } from './fetch/parse-fetch-args';
import { runFetch } from './fetch/run-fetch';
import { validateFetchRequest } from './fetch/validate-fetch-request';

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
