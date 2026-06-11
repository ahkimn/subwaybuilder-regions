import type { ParsedArgs } from 'minimist';

import { getExpectedDatasetIds } from './datasets';

export function readRequiredCliString(
  argv: ParsedArgs,
  optionName: string,
  positionalIndex: number,
): string {
  const value = argv[optionName] ?? argv._[positionalIndex];
  if (typeof value !== 'string' || value.trim().length === 0) {
    const flagName = optionName.replace(
      /[A-Z]/g,
      (character) => `-${character.toLowerCase()}`,
    );
    throw new Error(`Missing required argument: --${flagName}`);
  }
  return value.trim();
}

export function resolveCliDatasetId(
  countryCode: string,
  datasetToken: string,
): string {
  const normalizedCountryCode = countryCode.toUpperCase();
  const normalizedToken = datasetToken.trim().toLowerCase();
  const expectedDatasetIds = getExpectedDatasetIds(normalizedCountryCode);
  const candidates = [
    normalizedToken,
    `${normalizedCountryCode.toLowerCase()}-${normalizedToken}`,
  ];
  const datasetId = candidates.find((candidate) =>
    expectedDatasetIds.includes(candidate),
  );

  if (!datasetId) {
    throw new Error(
      `Invalid --dataset-id for ${normalizedCountryCode}: ${datasetToken}. Expected one of: ${expectedDatasetIds.join(', ') || 'none'}.`,
    );
  }
  return datasetId;
}
