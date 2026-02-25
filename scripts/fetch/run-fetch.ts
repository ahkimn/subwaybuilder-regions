import fs from 'fs-extra';

import { extractCABoundaries } from '../extract/extract-ca-map-features';
import { extractGBBoundaries } from '../extract/extract-gb-map-features';
import { extractUSBoundaries } from '../extract/extract-us-map-features';
import type { ExtractMapFeaturesArgs } from '../utils/cli';
import type { FetchDatasetArgs } from './parse-fetch-args';

export type FetchFailure = {
  datasetId: string;
  error: unknown;
};

export type FetchResult = {
  successes: string[];
  failures: FetchFailure[];
};

function renderProgressBar(completed: number, total: number): string {
  const width = 24;
  if (total <= 0) {
    return `[${'-'.repeat(width)}]`;
  }
  const filled = Math.round((completed / total) * width);
  return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}]`;
}

function renderProgressSummary(completed: number, total: number): string {
  const percent = total <= 0 ? 100 : Math.round((completed / total) * 100);
  return `${renderProgressBar(completed, total)} ${percent}% (${completed}/${total})`;
}

async function runCountryExtractor(
  args: ExtractMapFeaturesArgs,
): Promise<void> {
  const bbox = {
    west: args.west!,
    south: args.south!,
    east: args.east!,
    north: args.north!,
  };

  switch (args.countryCode) {
    case 'US':
      await extractUSBoundaries(args, bbox);
      return;
    case 'GB':
      await extractGBBoundaries(args, bbox);
      return;
    case 'CA':
      await extractCABoundaries(args, bbox);
      return;
    default:
      throw new Error(`Unsupported countryCode: ${args.countryCode}`);
  }
}

function buildExtractorArgs(
  request: FetchDatasetArgs,
  datasetId: string,
): ExtractMapFeaturesArgs {
  return {
    cityCode: request.cityCode,
    countryCode: request.countryCode,
    dataType: datasetId,
    west: request.bbox.west,
    south: request.bbox.south,
    east: request.bbox.east,
    north: request.bbox.north,
    compress: request.compress,
    outputRoot: request.out,
  };
}

export async function runFetch(
  request: FetchDatasetArgs,
): Promise<FetchResult> {
  const successes: string[] = [];
  const failures: FetchFailure[] = [];
  const totalDatasets = request.datasets.length;

  await fs.ensureDir(request.out);
  console.log(
    `[Fetch] Progress ${renderProgressSummary(0, totalDatasets)}`,
  );

  for (let index = 0; index < request.datasets.length; index += 1) {
    const datasetId = request.datasets[index];
    try {
      console.log(
        `[Fetch] [${index + 1}/${totalDatasets}] Generating ${datasetId} for ${request.cityCode} (${request.countryCode})...`,
      );
      await runCountryExtractor(buildExtractorArgs(request, datasetId));
      successes.push(datasetId);
      console.log(`[Fetch] Completed ${datasetId} (ok).`);
    } catch (error) {
      failures.push({ datasetId, error });
      console.error(`[Fetch] Failed ${datasetId} (error):`, error);
    }
    const completed = successes.length + failures.length;
    console.log(
      `[Fetch] Progress ${renderProgressSummary(completed, totalDatasets)}`,
    );
  }

  return { successes, failures };
}
