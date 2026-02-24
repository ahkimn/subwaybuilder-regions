import minimist from 'minimist';

import { parseValidBBox, requireString } from '../utils/cli';
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

export function parseFetchArgs(
  argvInput = process.argv.slice(2),
): FetchDatasetArgs {
  const argv = minimist(argvInput, {
    string: ['cityCode', 'countryCode', 'datasets', 'bbox', 'out'],
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
  const bbox = parseValidBBox(requireString(argv.bbox, 'bbox'));
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
