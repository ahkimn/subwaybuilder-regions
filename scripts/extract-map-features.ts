#!/usr/bin/env node

import path from 'path';
import process from 'process';

import { attachRegionPopulationData, BoundaryBox, filterAndClipRegionsToBoundary } from '../src/core/geometry.ts';
import { loadGeoJSON, loadCSV, requireString, Row, buildCSVIndex, saveGeoJSON } from '../src/utils/utils.ts';

import minimist from 'minimist';

// Usage: npx tsx scripts/extract-map-features.ts --input=england_districts.geojson [--south=.. --west=.. --north=.. --east=..]

type Args = {
  dataType: string;
  cityCode: string;
  south?: number;
  west?: number;
  north?: number;
  east?: number;
}


// Default map boundaries for EW (England & Wales) major cities
const MAN_SW: [number, number] = [
  53.2644710863043,
  -2.77246758214406
];
const MAN_NE: [number, number] = [
  53.73415058468834,
  -1.8114254393234717
]

const LIVE_SW: [number, number] = [
  53.130398700569714,
  -3.3940303789455015
]

const LIV_NE: [number, number] = [
  53.65970821393512,
  -2.3136265918773518
]

const NEW_SW: [number, number] = [
  54.752266180554386,
  -1.8864226676203373
]

const NEW_NE: [number, number] = [
  55.254520534623026,
  -1.1719471013825284
]

const BIR_SW: [number, number] = [
  52.20973366548009,
  -2.6821256158740994
]

const BIR_NE: [number, number] = [
  52.8759423334854,
  -1.2693546859004812
]

const LON_SW: [number, number] = [
  51.06896316565823,
  -1.073067468739282
]

const LON_NE: [number, number] = [
  51.909987066446575,
  0.6544543015209285
]


const EW_MAP_BOUNDARIES: Map<string, BoundaryBox> = new Map([
  ['MAN', {
    south: MAN_SW[0],
    west: MAN_SW[1],
    north: MAN_NE[0],
    east: MAN_NE[1],
  }],
  ['LIV', {
    south: LIVE_SW[0],
    west: LIVE_SW[1],
    north: LIV_NE[0],
    east: LIV_NE[1],
  }],
  ['NEW', {
    south: NEW_SW[0],
    west: NEW_SW[1],
    north: NEW_NE[0],
    east: NEW_NE[1],
  }],
  ['BIR', {
    south: BIR_SW[0],
    west: BIR_SW[1],
    north: BIR_NE[0],
    east: BIR_NE[1],
  }],
  ['LON', {
    south: LON_SW[0],
    west: LON_SW[1],
    north: LON_NE[0],
    east: LON_NE[1],
  }]
])

const EW_SUPPORTED_DATA_TYPES = new Set(['districts', 'bua']);

const EW_DISTRICT_BOUNDARIES = 'ew_district_boundaries.geojson';
const EW_DISTRICT_POPULATIONS = 'ew_district_populations.csv';

const EW_BUA_BOUNDARIES = 'ew_bua_boundaries.geojson';
const EW_BUA_POPULATIONS = 'ew_bua_populations.csv';

const DISTRICT_CODE_PROPERTY = 'LAD25CD';
const DISTRICT_NAME_PROPERTY = 'LAD25NM';
const DISTRICT_WELSH_NAME_PROPERTY = 'LAD25NMW';
const BUA_CODE_PROPERTY = 'BUA24CD';
const BUA_NAME_PROPERTY = 'BUA24NM';
const BUA_WELSH_NAME_PROPERTY = 'BUA24NMW';


function parseArgs(): Args {

  let argv = minimist(process.argv.slice(2), {
    string: ['data-type', 'city-code'],
    alias: {
      dataType: 'data-type',
      cityCode: 'city-code',
    },
  });

  const dataType: string = requireString(argv.dataType, 'data-type');
  const cityCode: string = requireString(argv.cityCode, 'city-code');

  const south = argv['south'] as number | undefined;
  const west = argv['west'] as number | undefined;
  const north = argv['north'] as number | undefined;
  const east = argv['east'] as number | undefined;

  console.log('Parsed arguments:', { "data-type": dataType, cityCode: cityCode, south: south, west: west, north: north, east: east });

  return {
    dataType: dataType!,
    cityCode: cityCode!,
    south: south,
    west: west,
    north: north,
    east: east,
  }
}

function getBboxFromArgs(args: Args): BoundaryBox {
  return {
    south: args.south!,
    west: args.west!,
    north: args.north!,
    east: args.east!,
  };
}



function extractBoundaries(args: Args): void {

  let region = "EW";

  if (region === "EW") {
    extractEWBoundaries(args);
  } else {
    // Should not occur...
    throw new Error(`Unsupported region: ${region}`);
  }


}



function extractEWBoundaries(args: Args): void {

  const existsInputBoundaries = args.south && args.west && args.north && args.east;

  if (!EW_MAP_BOUNDARIES.has(args.cityCode) && !existsInputBoundaries) {
    console.error(`Custom city code: ${args.cityCode} provided without bbox boundaries. Supported codes with default boundaries: ${Array.from(EW_MAP_BOUNDARIES.keys()).join(', ')}`);
    process.exit(1);
  }

  const bbox: BoundaryBox = existsInputBoundaries ? getBboxFromArgs(args) : EW_MAP_BOUNDARIES.get(args.cityCode)!

  let geojsonFile: string;
  let populationFile: string;

  let boundaryIDProperty: string;
  let boundaryNameProperty: string;
  let boundaryWelshNameProperty: string;


  if (args.dataType === 'districts') {
    geojsonFile = path.resolve('source_data', EW_DISTRICT_BOUNDARIES);
    populationFile = path.resolve('source_data', EW_DISTRICT_POPULATIONS);
    boundaryIDProperty = DISTRICT_CODE_PROPERTY;
    boundaryNameProperty = DISTRICT_NAME_PROPERTY;
    boundaryWelshNameProperty = DISTRICT_WELSH_NAME_PROPERTY;
  } else if (args.dataType === 'bua') {
    geojsonFile = path.resolve('source_data', EW_BUA_BOUNDARIES);
    populationFile = path.resolve('source_data', EW_BUA_POPULATIONS);
    boundaryIDProperty = BUA_CODE_PROPERTY;
    boundaryNameProperty = BUA_NAME_PROPERTY;
    boundaryWelshNameProperty = BUA_WELSH_NAME_PROPERTY;
  } else {
     throw new Error(`Unsupported data type for EW: ${args.dataType}, supported types are: ${Array.from(EW_SUPPORTED_DATA_TYPES).join(', ')}`);
  }

  const boundaries: GeoJSON.FeatureCollection = loadGeoJSON(geojsonFile);

  console.log(`Loaded ${boundaries.features.length} features.`);

  const filteredRegions = filterAndClipRegionsToBoundary(
    boundaries, 
    bbox,
    boundaryIDProperty,
    boundaryNameProperty,
    // Prefer Welsh name if available for display
    [boundaryWelshNameProperty, boundaryNameProperty],
    
  );

  console.log(`Filtered to ${filteredRegions.length} features within boundary box.`);

  const populationCharacteristics: Row[] = loadCSV(populationFile);
  const populationIndex: Map<string, string> = buildCSVIndex(populationCharacteristics, 'Name', 'Population');

  console.log(`Loaded population data for ${populationIndex.size} regions.`);

  attachRegionPopulationData(
    filteredRegions,
    populationIndex
  )

  const outputFilePath = path.resolve(
    'data', args.cityCode, `${args.dataType}.geojson`);

  const outputFeatureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: filteredRegions
  };

  saveGeoJSON(
    outputFilePath,
    outputFeatureCollection
  );
}


function main(): void {
  const args: Args = parseArgs();
  extractBoundaries(args);
}

main();


