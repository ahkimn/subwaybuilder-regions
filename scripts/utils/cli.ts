// --- Argument Validation --- //

import minimist from "minimist";
import { BoundaryBox } from "./geometry";

const AVAILABLE_COUNTRY_CODES = new Set(['GB', 'US']);

export type ExtractMapFeaturesArgs = {
  dataType: string;
  cityCode: string;
  countryCode: string;
  south?: number;
  west?: number;
  north?: number;
  east?: number;
  useLocalData?: boolean;
};

export function requireString(
  value: any,
  name: string
): string {
  if (typeof value !== 'string' || value.length === 0) {
    console.error(`Missing or invalid argument: --${name}`);
    process.exit(1);
  }
  return value;
}

export function requireNumber(
  value: any,
  name: string
): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  console.error(`Missing or invalid argument: --${name}`);
  process.exit(1);
}

export function parseNumber(
  value: string
): number | undefined {
  const normalizedValue = value.replace(/,/g, '').trim();
  const parsedNumber = Number(normalizedValue);

  return Number.isFinite(parsedNumber) ? parsedNumber : undefined;
}


export function parseArgs(): ExtractMapFeaturesArgs {

  let argv = minimist(process.argv.slice(2), {
    string: ['data-type', 'city-code', 'country-code'],
    boolean: ['use-local-data'],
    alias: {
      dataType: 'data-type',
      cityCode: 'city-code',
    },
  });

  const dataType: string = requireString(argv.dataType, 'data-type');
  const cityCode: string = requireString(argv.cityCode, 'city-code');
  const countryCode: string = requireString(argv.countryCode, 'country-code');

  if (!AVAILABLE_COUNTRY_CODES.has(countryCode)) {
    console.error(`Unsupported country code: ${countryCode}, supported codes are: ${Array.from(AVAILABLE_COUNTRY_CODES).join(', ')}`);
    process.exit(1);
  }

  const south = argv['south'] as number | undefined;
  const west = argv['west'] as number | undefined;
  const north = argv['north'] as number | undefined;
  const east = argv['east'] as number | undefined;

  const useLocalData = argv['use-local-data'] as boolean | undefined;

  console.log('Parsed arguments:', { "data-type": dataType, countryCode: countryCode, cityCode: cityCode, south: south, west: west, north: north, east: east, useLocalData: useLocalData });

  return {
    dataType: dataType!,
    cityCode: cityCode!,
    countryCode: countryCode!,
    south: south,
    west: west,
    north: north,
    east: east,
    useLocalData: useLocalData
  }
}

// --- Argument Helpers --- //
export function hasExplicitBBox(args: ExtractMapFeaturesArgs): args is ExtractMapFeaturesArgs & BoundaryBox {
  return [args.south, args.west, args.north, args.east].every(v => typeof v === 'number');
}

export function getBBoxFromArgs(args: ExtractMapFeaturesArgs): BoundaryBox {
  return {
    south: args.south!,
    west: args.west!,
    north: args.north!,
    east: args.east!,
  };
}
