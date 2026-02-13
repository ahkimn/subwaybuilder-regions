// --- Argument Validation --- //

import minimist from 'minimist';

import type { BoundaryBox } from './geometry';
import { getSupportedCountryCodes } from './osm-country-config';

const BUILT_IN_COUNTRY_CODES = ['GB', 'US'];

function getAvailableCountryCodes(): Set<string> {
  return new Set([...BUILT_IN_COUNTRY_CODES, ...getSupportedCountryCodes()]);
}

export type ExtractMapFeaturesArgs = {
  dataType: string;
  cityCode: string;
  countryCode: string;
  south?: number;
  west?: number;
  north?: number;
  east?: number;
  useLocalData?: boolean;
  preview?: boolean;
  previewCount?: number;
};

const DEFAULT_PREVIEW_COUNT = 5;

export function requireString(value: any, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    console.error(`Missing or invalid argument: --${name}`);
    process.exit(1);
  }
  return value;
}

export function requireNumber(value: any, name: string, positive?: boolean): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (positive && value <= 0) {
      console.error(`Missing or invalid argument: --${name}. Expected a positive number.`);
      process.exit(1);
    }
    return value;
  }
  console.error(`Missing or invalid argument: --${name}`);
  process.exit(1);
}

export function parseNumber(value: string): number | undefined {
  const normalizedValue = value.replace(/,/g, '').trim();
  const parsedNumber = Number(normalizedValue);

  return Number.isFinite(parsedNumber) ? parsedNumber : undefined;
}

export function parseArgs(): ExtractMapFeaturesArgs {
  let argv = minimist(process.argv.slice(2), {
    string: ['data-type', 'city-code', 'country-code'],
    boolean: ['use-local-data', 'preview'],
    alias: {
      'data-type': 'dataType',
      'city-code': 'cityCode',
      'country-code': 'countryCode',
      'use-local-data': 'useLocalData',
    },
  });

  const dataType: string = requireString(
    argv.dataType ?? argv['data-type'],
    'data-type',
  );
  const cityCode: string = requireString(
    argv.cityCode ?? argv['city-code'],
    'city-code',
  );
  const countryCode: string = requireString(
    argv.countryCode ?? argv['country-code'],
    'country-code',
  );
  const availableCountryCodes = getAvailableCountryCodes();

  if (!availableCountryCodes.has(countryCode)) {
    console.error(
      `Unsupported country code: ${countryCode}, supported codes are: ${Array.from(availableCountryCodes).join(', ')}`,
    );
    process.exit(1);
  }

  const south = argv['south'] as number | undefined;
  const west = argv['west'] as number | undefined;
  const north = argv['north'] as number | undefined;
  const east = argv['east'] as number | undefined;

  const useLocalData = (argv.useLocalData ??
    argv['use-local-data']) as boolean | undefined;

  const preview = (argv.preview ?? argv['preview']) as boolean | undefined;

  console.log('Parsed arguments:', {
    'data-type': dataType,
    countryCode: countryCode,
    cityCode: cityCode,
    south: south,
    west: west,
    north: north,
    east: east,
    useLocalData: useLocalData,
    preview: preview
  });

  return {
    dataType: dataType!,
    cityCode: cityCode!,
    countryCode: countryCode!,
    south: south,
    west: west,
    north: north,
    east: east,
    useLocalData: useLocalData,
    preview: preview,
    previewCount: DEFAULT_PREVIEW_COUNT,
  };
}

// --- Argument Helpers --- //
export function hasExplicitBBox(
  args: ExtractMapFeaturesArgs,
): args is ExtractMapFeaturesArgs & BoundaryBox {
  return [args.south, args.west, args.north, args.east].every(
    (v) => typeof v === 'number',
  );
}

export function getBBoxFromArgs(args: ExtractMapFeaturesArgs): BoundaryBox {
  return {
    south: args.south!,
    west: args.west!,
    north: args.north!,
    east: args.east!,
  };
}
