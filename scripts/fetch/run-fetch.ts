import { extractCABoundaries } from '../extract/extract-ca-map-features';
import { extractGBBoundaries } from '../extract/extract-gb-map-features';
import { extractUSBoundaries } from '../extract/extract-us-map-features';
import type { ExtractMapFeaturesArgs } from '../utils/cli';
import type { FetchCityDatasetsArgs } from './parse-fetch-args';

export type FetchFailure = {
  datasetId: string;
  error: unknown;
};

export type FetchRunResult = {
  successes: string[];
  failures: FetchFailure[];
};

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
  request: FetchCityDatasetsArgs,
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
  request: FetchCityDatasetsArgs,
): Promise<FetchRunResult> {
  const successes: string[] = [];
  const failures: FetchFailure[] = [];

  for (const datasetId of request.datasets) {
    try {
      console.log(
        `[Fetch] Generating ${datasetId} for ${request.cityCode} (${request.countryCode})...`,
      );
      await runCountryExtractor(buildExtractorArgs(request, datasetId));
      successes.push(datasetId);
      console.log(`[Fetch] Completed ${datasetId}.`);
    } catch (error) {
      failures.push({ datasetId, error });
      console.error(`[Fetch] Failed ${datasetId}:`, error);
    }
  }

  return { successes, failures };
}
