#!/usr/bin/env node
import path from 'path';

import { CITY_BOUNDARIES_FILE, SOURCE_DATA_DIR } from '../shared/constants';
import { extractCABoundaries } from './extract/extract-ca-map-features';
import { extractGBBoundaries } from './extract/extract-gb-map-features';
import { extractWorldMapFeatures } from './extract/extract-row-map-features';
import { extractUSBoundaries } from './extract/extract-us-map-features';
import {
  type ExtractMapFeaturesArgs,
  getBBoxFromArgs,
  hasExplicitBBox,
  parseArgs,
} from './utils/cli';
import { loadBoundariesFromCSV } from './utils/files';
import type { BoundaryBox } from './utils/geometry';
import { findOsmCountryConfig } from './utils/osm-country-config';

const BOUNDARIES_INDEX_FILE = path.resolve(
  __dirname,
  '..',
  SOURCE_DATA_DIR,
  CITY_BOUNDARIES_FILE,
);

/**
 * Dev-time script to extract a single dataset for a city, based on either:
  - Default boundaries defined in the boundaries.csv for known city codes
  - Custom boundaries provided via fully specified bbox arguments (west, south, east, north)
 */
async function extractBoundaries(args: ExtractMapFeaturesArgs): Promise<void> {
  // Default map boundaries for all cities, loaded from CSV
  const cityMapBoundaries = loadBoundariesFromCSV(BOUNDARIES_INDEX_FILE);
  const osmCountryConfig = findOsmCountryConfig(args.countryCode);

  const existsInputBoundaries = hasExplicitBBox(args);

  if (!cityMapBoundaries.has(args.cityCode) && !existsInputBoundaries) {
    console.error(
      `Custom city code: ${args.cityCode} provided without bbox boundaries. Supported codes with default boundaries: ${Array.from(cityMapBoundaries.keys()).join(', ')}`,
    );
    process.exit(1);
  }

  const bbox: BoundaryBox = existsInputBoundaries
    ? getBBoxFromArgs(args)
    : cityMapBoundaries.get(args.cityCode)!;

  switch (args.countryCode) {
    case 'CA':
      await extractCABoundaries(args, bbox);
      break;
    case 'GB':
      await extractGBBoundaries(args, bbox);
      break;
    case 'US':
      await extractUSBoundaries(args, bbox);
      break;
    default:
      if (osmCountryConfig) {
        const boundaryConfig = osmCountryConfig.availableBoundaryTypes.find(
          (entry) => entry.datasetId === args.dataType,
        );

        if (!boundaryConfig) {
          throw new Error(
            `Unsupported data type for ${args.countryCode}: ${args.dataType}. Supported data types: ${osmCountryConfig.availableBoundaryTypes.map((entry) => entry.datasetId).join(', ')}`,
          );
        }

        await extractWorldMapFeatures(args, bbox, boundaryConfig);
        break;
      }
      throw new Error(
        `Boundary extraction for country code: ${args.countryCode} not yet implemented`,
      );
  }
}

function main(): void {
  const args: ExtractMapFeaturesArgs = parseArgs();
  extractBoundaries(args);
}

main();
