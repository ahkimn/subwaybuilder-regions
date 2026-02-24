import type { CountryCode, FetchDatasetArgs } from './parse-fetch-args';

const FETCH_ELIGIBLE_DATASETS: Record<CountryCode, readonly string[]> = {
  US: ['counties', 'county-subdivisions', 'zctas'],
  GB: ['districts', 'bua', 'wards'],
  CA: ['feds', 'csds', 'fsas'],
};

export function validateFetchRequest(args: FetchDatasetArgs): void {
  const isAvailableCountry = FETCH_ELIGIBLE_DATASETS[args.countryCode];
  if (!isAvailableCountry) {
    throw new Error(`Unsupported countryCode: ${args.countryCode}`);
  }

  if (args.datasets.length === 0) {
    throw new Error('At least one dataset must be specified');
  }

  const disallowedDatasets = args.datasets.filter(
    (datasetId) => !isAvailableCountry.includes(datasetId),
  );

  if (disallowedDatasets.length > 0) {
    throw new Error(
      `Unsupported datasets for ${args.countryCode}: ${disallowedDatasets.join(', ')}. Allowed: ${isAvailableCountry.join(', ')}`,
    );
  }
}
