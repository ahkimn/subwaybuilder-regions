#!/usr/bin/env node
import path from 'path';

import { loadBoundariesFromCSV } from './utils/files.ts';
import { ExtractMapFeaturesArgs, getBboxFromArgs, hasExplicitBbox, parseArgs } from './utils/cli.ts';

import { BoundaryBox } from './utils/geometry.ts';
import { extractUSBoundaries } from './extract/extract-us-map-features.ts';
import { extractGBBoundaries } from './extract/extract-gb-map-features.ts';
import { CITY_BOUNDARIES_FILE, SOURCE_DATA_DIR } from '../shared/consts.ts';

const BOUNDARIES_INDEX_FILE = path.resolve(__dirname, '..', SOURCE_DATA_DIR, CITY_BOUNDARIES_FILE);

async function extractBoundaries(args: ExtractMapFeaturesArgs): Promise<void> {

  // Default map boundaries for all cities, loaded from CSV
  const cityMapBoundaries = loadBoundariesFromCSV(BOUNDARIES_INDEX_FILE);

  const existsInputBoundaries = hasExplicitBbox(args);

  if (!cityMapBoundaries.has(args.cityCode) && !existsInputBoundaries) {
    console.error(`Custom city code: ${args.cityCode} provided without bbox boundaries. Supported codes with default boundaries: ${Array.from(cityMapBoundaries.keys()).join(', ')}`);
    process.exit(1);
  }

  const bbox: BoundaryBox = existsInputBoundaries ? getBboxFromArgs(args) : cityMapBoundaries.get(args.cityCode)!

  switch (args.countryCode) {
    case "GB":
      await extractGBBoundaries(args, bbox);
      break;
    case "US":
      await extractUSBoundaries(args, bbox);
      break;
    default:
      throw new Error(`Boundary extraction for country code: ${args.countryCode} not yet implemented`);
  }
}

function main(): void {
  const args: ExtractMapFeaturesArgs = parseArgs();
  extractBoundaries(args);
}

main();
