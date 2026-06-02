#!/usr/bin/env node
import minimist from 'minimist';

import { sanitizeRegionDataset } from './regions/sanitize';

function main(): void {
  const argv = minimist(process.argv.slice(2), {
    string: [
      'input',
      'country-code',
      'countryCode',
      'city-code',
      'cityCode',
      'dataset-id',
      'datasetId',
      'output-root',
      'outputRoot',
      'out',
    ],
    boolean: ['compress', 'update-index', 'updateIndex'],
    default: {
      compress: true,
      'update-index': true,
    },
    alias: {
      'city-code': 'cityCode',
      'country-code': 'countryCode',
      'dataset-id': 'datasetId',
      'output-root': 'outputRoot',
      'update-index': 'updateIndex',
    },
  });

  const inputPath = argv.input ?? argv._[0];
  if (typeof inputPath !== 'string' || inputPath.length === 0) {
    throw new Error(
      'Usage: tsx scripts/sanitize-region-dataset.ts <geojson> <PE|CN> [CITY] [DATASET] [OUT_DIR]',
    );
  }

  if (typeof argv.countryCode !== 'string' || argv.countryCode.length === 0) {
    const positionalCountryCode = argv._[1];
    if (
      typeof positionalCountryCode !== 'string' ||
      positionalCountryCode.length === 0
    ) {
      throw new Error('Missing required argument: --country-code');
    }
    argv.countryCode = positionalCountryCode;
  }

  const result = sanitizeRegionDataset({
    inputPath,
    countryCode: argv.countryCode,
    cityCode: argv.cityCode ?? argv._[2],
    datasetId: argv.datasetId ?? argv._[3],
    outputRoot: argv.outputRoot ?? argv.out ?? argv._[4],
    compress: Boolean(argv.compress),
    updateIndex: Boolean(argv.updateIndex),
  });

  console.log(JSON.stringify(result, null, 2));
}

main();
