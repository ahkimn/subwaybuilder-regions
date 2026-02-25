import minimist from 'minimist';

import {
  getBBoxFromArgs,
  hasExplicitBBox,
  parseNumber,
  requireString,
} from '../utils/cli';
import type { BoundaryBox } from '../utils/geometry';

export type CountryCode = 'US' | 'GB' | 'CA';

export type FetchDatasetArgs = {
  cityCode: string;
  countryCode: CountryCode;
  datasets: string[];
  bbox: BoundaryBox;
  compress: boolean;
  out: string;
};

function parseDatasets(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readOptionValue(
  argvInput: string[],
  optionName: string,
): string | undefined {
  for (let index = 0; index < argvInput.length; index += 1) {
    const current = argvInput[index];
    if (current === `--${optionName}`) {
      return argvInput[index + 1];
    }
    if (current.startsWith(`--${optionName}=`)) {
      return current.slice(optionName.length + 3);
    }
  }
  return undefined;
}

export function parseFetchArgs(
  argvInput = process.argv.slice(2),
): FetchDatasetArgs {
  const argv = minimist(argvInput, {
    string: ['cityCode', 'countryCode', 'datasets', 'out'],
    boolean: ['compress'],
    default: {
      compress: true,
      out: './data',
    },
    alias: {
      'city-code': 'cityCode',
      'country-code': 'countryCode',
    },
  });

  const cityCode = requireString(
    argv.cityCode ?? argv['city-code'],
    'cityCode',
  ).toUpperCase();
  const countryCode = requireString(
    argv.countryCode ?? argv['country-code'],
    'countryCode',
  ).toUpperCase() as CountryCode;
  const datasets = parseDatasets(requireString(argv.datasets, 'datasets'));
  const bboxArgs = {
    west:
      parseNumber(argv.west) ?? parseNumber(readOptionValue(argvInput, 'west')),
    south:
      parseNumber(argv.south) ??
      parseNumber(readOptionValue(argvInput, 'south')),
    east:
      parseNumber(argv.east) ?? parseNumber(readOptionValue(argvInput, 'east')),
    north:
      parseNumber(argv.north) ??
      parseNumber(readOptionValue(argvInput, 'north')),
  };
  if (!hasExplicitBBox(bboxArgs)) {
    console.error(
      'Missing or invalid bbox arguments. Provide all four: --west --south --east --north',
    );
    process.exit(1);
  }
  const bbox = getBBoxFromArgs(bboxArgs);
  const out = requireString(argv.out, 'out');
  const compress = Boolean(argv.compress);

  return {
    cityCode,
    countryCode,
    datasets,
    bbox,
    compress,
    out,
  };
}
