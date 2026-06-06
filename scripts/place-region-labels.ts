#!/usr/bin/env node
import minimist from 'minimist';

import { placeRegionLabels } from './regions/labels';

function main(): void {
  const argv = minimist(process.argv.slice(2), {
    string: ['input', 'output-root', 'outputRoot', 'out'],
    boolean: ['in-place', 'inPlace', 'refresh', 'update-index', 'updateIndex'],
    alias: {
      'in-place': 'inPlace',
      'output-root': 'outputRoot',
      'update-index': 'updateIndex',
    },
  });

  const inputPath = argv.input ?? argv._[0];
  if (typeof inputPath !== 'string' || inputPath.length === 0) {
    throw new Error(
      'Usage: tsx scripts/place-region-labels.ts <geojson|city-dir|archive> [OUT_DIR] [in-place] [refresh] [update-index]',
    );
  }

  const result = placeRegionLabels({
    inputPath,
    outputRoot: argv.outputRoot ?? argv.out ?? argv._[1],
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
