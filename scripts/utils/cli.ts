// --- Argument Validation --- //

import minimist from 'minimist';

import type { BoundaryBox } from './geometry';
import { getSupportedCountryCodes } from './osm-country-config';

const BUILT_IN_COUNTRY_CODES = ['AU', 'CA', 'FR', 'GB', 'US'];

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
  compress?: boolean;
  outputRoot?: string;
  preview?: boolean;
  previewCount?: number;
};

export type ExportArchivesArgs = {
  all: boolean;
  cityCodes: string[];
  includeOSMData: boolean;
  outputDir: string;
};

const DEFAULT_PREVIEW_COUNT = 5;

type CoordinateBoxArgs = {
  south?: number;
  west?: number;
  north?: number;
  east?: number;
};

// --- Required Argument Helpers --- //

export function requireString(value: any, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    console.error(`Missing or invalid argument: --${name}`);
    process.exit(1);
  }
  return value;
}

export function requireNumber(
  value: any,
  name: string,
  positive?: boolean,
): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (positive && value <= 0) {
      console.error(
        `Missing or invalid argument: --${name}. Expected a positive number.`,
      );
      process.exit(1);
    }
    return value;
  }
  console.error(`Missing or invalid argument: --${name}`);
  process.exit(1);
}

export function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalizedValue = value.replace(/,/g, '').trim();
  const parsedNumber = Number(normalizedValue);

  return Number.isFinite(parsedNumber) ? parsedNumber : undefined;
}

export function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

export function toPositiveInteger(value: unknown): number | undefined {
  const parsedNumber = parseNumber(value);
  if (parsedNumber === undefined) {
    return undefined;
  }
  return Number.isInteger(parsedNumber) && parsedNumber > 0
    ? parsedNumber
    : undefined;
}

export function hasExplicitBBox<T extends CoordinateBoxArgs>(
  args: T,
): args is T & BoundaryBox {
  return [args.south, args.west, args.north, args.east].every((v) =>
    Number.isFinite(v),
  );
}

export function getBBoxFromArgs<T extends CoordinateBoxArgs>(
  args: T,
): BoundaryBox {
  return {
    south: args.south!,
    west: args.west!,
    north: args.north!,
    east: args.east!,
  };
}

// --- Argument Parsing for Boundary Extraction --- //

export function parseArgs(): ExtractMapFeaturesArgs {
  let argv = minimist(process.argv.slice(2), {
    string: ['data-type', 'city-code', 'country-code'],
    boolean: ['compress', 'use-local-data', 'preview'],
    default: {
      compress: true,
    },
    alias: {
      'data-type': 'dataType',
      'city-code': 'cityCode',
      'country-code': 'countryCode',
      compress: 'compress',
      'use-local-data': 'useLocalData',
    },
  });

  console.log('Raw parsed arguments:', argv);

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

  const south = parseNumber(argv.south);
  const west = parseNumber(argv.west);
  const north = parseNumber(argv.north);
  const east = parseNumber(argv.east);

  const useLocalData = (argv.useLocalData ?? argv['use-local-data']) as
    | boolean
    | undefined;

  const preview = (argv.preview ?? argv['preview']) as boolean | undefined;
  const compress = (argv.compress ?? argv['compress']) as boolean | undefined;

  console.log('Parsed arguments:', {
    dataType: dataType,
    countryCode: countryCode,
    cityCode: cityCode,
    south: south,
    west: west,
    north: north,
    east: east,
    useLocalData: useLocalData,
    compress: compress,
    preview: preview,
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
    compress: compress,
    preview: preview,
    previewCount: DEFAULT_PREVIEW_COUNT,
  };
}

// --- Argument Parsing for Exporting Archives --- //

export function parseExportArgs(): ExportArchivesArgs {
  const argv = minimist(process.argv.slice(2), {
    string: ['city-code', 'cityCode', 'output-dir', 'outputDir'],
    boolean: ['all', 'include-osm-data', 'includeOSMData'],
    default: {
      all: false,
      'include-osm-data': false,
      'output-dir': 'export',
    },
    alias: {
      'city-code': 'cityCode',
      'output-dir': 'outputDir',
      'include-osm-data': 'includeOSMData',
    },
  });

  console.log('Raw export arguments:', argv);

  const all = Boolean(argv.all);
  const includeOSMData = Boolean(
    argv.includeOSMData ?? argv['include-osm-data'],
  );
  const outputDir = requireString(
    argv.outputDir ?? argv['output-dir'],
    'output-dir',
  );

  const cityCodeArg = argv.cityCode ?? argv['city-code'];
  const cityCodeList = String(cityCodeArg ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value) => value.length > 0);

  if (!all && cityCodeList.length === 0) {
    console.error(
      'Missing or invalid argument: --city-code (or pass --all to export all cities in boundaries.csv)',
    );
    process.exit(1);
  }

  return {
    all,
    cityCodes: cityCodeList,
    includeOSMData,
    outputDir,
  };
}
