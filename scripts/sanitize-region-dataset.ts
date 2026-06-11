#!/usr/bin/env node
import minimist from 'minimist';

import { readRequiredCliString, resolveCliDatasetId } from './regions/cli';
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
      'Usage: tsx scripts/sanitize-region-dataset.ts <geojson> <COUNTRY> <CITY> <DATASET> [OUT_DIR]',
    );
  }

  const countryCode = readRequiredCliString(argv, 'countryCode', 1);
  const cityCode = readRequiredCliString(argv, 'cityCode', 2);
  const datasetToken = readRequiredCliString(argv, 'datasetId', 3);

  const result = sanitizeRegionDataset({
    inputPath,
    countryCode,
    cityCode,
    datasetId: resolveCliDatasetId(countryCode, datasetToken),
    outputRoot: argv.outputRoot ?? argv.out ?? argv._[4],
    compress: Boolean(argv.compress),
    updateIndex: Boolean(argv.updateIndex),
  });

  console.log(JSON.stringify(result, null, 2));
}

main();
