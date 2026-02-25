import {
  DATASET_METADATA_CATALOG,
  resolveCountryDatasetOrder,
} from '../../shared/datasets/catalog';
import type { CountryCode, FetchDatasetArgs } from './parse-fetch-args';

function resolveFetchEligibleDatasets(countryCode: CountryCode): string[] {
  return resolveCountryDatasetOrder(countryCode).filter((datasetId) => {
    const metadata = DATASET_METADATA_CATALOG[datasetId];
    return Boolean(metadata?.existsOnlineSource);
  });
}

export function validateFetchRequest(args: FetchDatasetArgs): void {
  const availableDatasets = resolveFetchEligibleDatasets(args.countryCode);
  if (availableDatasets.length === 0) {
    throw new Error(`Unsupported countryCode: ${args.countryCode}`);
  }

  if (args.datasets.length === 0) {
    throw new Error('At least one dataset must be specified');
  }

  const disallowedDatasets = args.datasets.filter(
    (datasetId) => !availableDatasets.includes(datasetId),
  );

  if (disallowedDatasets.length > 0) {
    throw new Error(
      `Unsupported datasets for ${args.countryCode}: ${disallowedDatasets.join(', ')}. Allowed: ${availableDatasets.join(', ')}`,
    );
  }
}
