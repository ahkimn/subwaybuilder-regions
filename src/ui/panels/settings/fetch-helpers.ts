import {
  CATALOG_STATIC_COUNTRIES,
  DATASET_METADATA_CATALOG,
  type DatasetTemplateMetadata,
  resolveCountryDatasetOrder,
} from '@shared/datasets/catalog';

import { resolveStaticTemplateCountry } from '@/core/registry/static';
import type { City } from '@/types/cities';

export type FetchCountryCode = 'US' | 'GB' | 'CA' | '';

export type FetchParameters = {
  cityCode: string;
  countryCode: FetchCountryCode;
  datasetIds: string[];
  west: string;
  south: string;
  east: string;
  north: string;
};

export type FetchCommandContext = {
  platform: string;
  params: FetchParameters;
  relativeModPath: string;
  outPath?: string;
};

export function resolveCityCountryCode(
  city: City | undefined,
): FetchCountryCode {
  if (!city) {
    return '';
  }

  const resolvedCountry = resolveStaticTemplateCountry({
    code: city.code,
    country: city.country,
  });
  if (
    resolvedCountry === 'US' ||
    resolvedCountry === 'GB' ||
    resolvedCountry === 'CA'
  ) {
    return resolvedCountry;
  }

  return '';
}

export function getFetchableDatasetsForCountry(
  countryCode: FetchCountryCode,
): DatasetTemplateMetadata[] {
  if (!countryCode) {
    return [];
  }

  return resolveCountryDatasetOrder(countryCode)
    .map((datasetId) => DATASET_METADATA_CATALOG[datasetId])
    .filter((metadata): metadata is DatasetTemplateMetadata =>
      Boolean(metadata),
    )
    .filter((metadata) => metadata.existsOnlineSource);
}

export function isWindowsPlatform(platform: string): boolean {
  return platform.toLowerCase() === 'win32';
}

export function getFetchCountryOptions(): Exclude<FetchCountryCode, ''>[] {
  return CATALOG_STATIC_COUNTRIES.filter(
    (countryCode): countryCode is Exclude<FetchCountryCode, ''> =>
      countryCode === 'US' || countryCode === 'GB' || countryCode === 'CA',
  );
}

export function formatFetchCommand({
  platform,
  params,
  relativeModPath,
  outPath = './data',
}: FetchCommandContext): string {
  const normalizedRelativeModPath = normalizeRelativePath(relativeModPath);
  const scriptPath = normalizedRelativeModPath
    ? isWindowsPlatform(platform)
      ? `.\\${toWindowsPath(normalizedRelativeModPath)}\\fetch.ps1`
      : `./${normalizedRelativeModPath}/fetch.sh`
    : isWindowsPlatform(platform)
      ? '.\\fetch.ps1'
      : './fetch.sh';
  const scriptInvocation = isWindowsPlatform(platform)
    ? `& "${scriptPath}"`
    : scriptPath;
  const resolvedOutPath = outPath.length
    ? outPath
    : isWindowsPlatform(platform)
      ? normalizedRelativeModPath
        ? `.\\${toWindowsPath(normalizedRelativeModPath)}\\data`
        : '.\\data'
      : normalizedRelativeModPath
        ? `./${normalizedRelativeModPath}/data`
        : './data';
  const datasets = params.datasetIds.join(',');

  return [
    scriptInvocation,
    `--cityCode "${params.cityCode}"`,
    `--countryCode "${params.countryCode}"`,
    `--datasets "${datasets}"`,
    `--west ${params.west}`,
    `--south ${params.south}`,
    `--east ${params.east}`,
    `--north ${params.north}`,
    `--out "${resolvedOutPath}"`,
  ].join(' ');
}

export function buildFetchErrors(args: {
  cityCode: string;
  countryCode: FetchCountryCode;
  datasetIds: string[];
  bboxAvailable: boolean;
}): string[] {
  const errors: string[] = [];

  if (!args.cityCode) {
    errors.push('Select a city to generate a fetch command.');
  }
  if (!args.countryCode) {
    errors.push('Selected city does not map to a supported fetch country.');
  }
  if (args.datasetIds.length === 0) {
    errors.push('Select at least one dataset.');
  }
  if (!args.bboxAvailable) {
    errors.push(
      'Cannot generate command: demand data bbox unavailable for selected city.',
    );
  }

  return errors;
}

export function buildDefaultFetchOutPath(
  platform: string,
  relativeModPath: string,
): string {
  const normalizedRelativeModPath = normalizeRelativePath(relativeModPath);
  if (isWindowsPlatform(platform)) {
    return normalizedRelativeModPath
      ? `.\\${toWindowsPath(normalizedRelativeModPath)}\\data`
      : '.\\data';
  }
  return normalizedRelativeModPath
    ? `./${normalizedRelativeModPath}/data`
    : './data';
}

function normalizeRelativePath(pathValue: string): string {
  return pathValue
    .replace(/\\/g, '/')
    .replace(/^\.?\/+/, '')
    .replace(/\/+$/, '');
}

function toWindowsPath(pathValue: string): string {
  return pathValue.replace(/\//g, '\\');
}
