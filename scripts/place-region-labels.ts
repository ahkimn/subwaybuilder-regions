#!/usr/bin/env node
import minimist from 'minimist';

import { placeRegionLabels } from './regions/labels';

function main(): void {
  const argv = minimist(process.argv.slice(2), {
    string: ['input', 'output-root', 'outputRoot', 'out'],
    boolean: ['in-place', 'inPlace', 'refresh'],
    alias: {
      'in-place': 'inPlace',
      'output-root': 'outputRoot',
    },
  });

  const inputPath = argv.input ?? argv._[0];
  if (typeof inputPath !== 'string' || inputPath.length === 0) {
    throw new Error(
      'Usage: tsx scripts/place-region-labels.ts --input=<geojson|city-dir|archive> [--out=<dir>] [--in-place] [--refresh]',
    );
  }

  const result = placeRegionLabels({
    inputPath,
    outputRoot: argv.outputRoot ?? argv.out,
    inPlace: Boolean(argv.inPlace),
    refresh: Boolean(argv.refresh),
  });

  console.log(JSON.stringify(result, null, 2));
}

main();
