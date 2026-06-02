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
      out: 'data',
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
      'Usage: tsx scripts/sanitize-region-dataset.ts --input=<geojson> --country-code=PE|CN [--city-code=<CITY>] [--dataset-id=<DATASET>] [--out=data]',
    );
  }

  if (typeof argv.countryCode !== 'string' || argv.countryCode.length === 0) {
    throw new Error('Missing required argument: --country-code');
  }

  const result = sanitizeRegionDataset({
    inputPath,
    countryCode: argv.countryCode,
    cityCode: argv.cityCode,
    datasetId: argv.datasetId,
    outputRoot: argv.outputRoot ?? argv.out,
    compress: Boolean(argv.compress),
    updateIndex: Boolean(argv.updateIndex),
  });

  console.log(JSON.stringify(result, null, 2));
}

main();
