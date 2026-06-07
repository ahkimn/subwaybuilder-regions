#!/usr/bin/env node
import minimist from 'minimist';

import { readRequiredCliString } from './regions/cli';
import { placeRegionLabels } from './regions/labels';

function main(): void {
  const argv = minimist(process.argv.slice(2), {
    string: [
      'input',
      'country-code',
      'countryCode',
      'city-code',
      'cityCode',
      'output-root',
      'outputRoot',
      'out',
    ],
    boolean: ['in-place', 'inPlace', 'refresh', 'update-index', 'updateIndex'],
    alias: {
      'in-place': 'inPlace',
      'country-code': 'countryCode',
      'city-code': 'cityCode',
      'output-root': 'outputRoot',
      'update-index': 'updateIndex',
    },
  });

  const inputPath = argv.input ?? argv._[0];
  if (typeof inputPath !== 'string' || inputPath.length === 0) {
    throw new Error(
      'Usage: tsx scripts/place-region-labels.ts <geojson|city-dir|archive> <COUNTRY> <CITY> [OUT_DIR] [in-place] [refresh] [update-index]',
    );
  }

  const result = placeRegionLabels({
    inputPath,
    countryCode: readRequiredCliString(argv, 'countryCode', 1),
    cityCode: readRequiredCliString(argv, 'cityCode', 2),
    outputRoot: argv.outputRoot ?? argv.out ?? argv._[3],
    inPlace:
      Boolean(argv.inPlace) ||
      argv._.some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().replace(/^--/, '') === 'in-place',
      ),
    refresh:
      Boolean(argv.refresh) ||
      argv._.some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().replace(/^--/, '') === 'refresh',
      ),
    updateIndex:
      Boolean(argv.updateIndex) ||
      argv._.some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().replace(/^--/, '') === 'update-index',
      ),
  });

  console.log(JSON.stringify(result, null, 2));
}

main();
