#!/usr/bin/env node

import path from 'path';
import process from 'process';

import osmtogeojson from 'osmtogeojson';
import { loadGeoJSON, loadCSV, requireString, Row, buildCSVIndex, saveGeoJSON, loadGeoJSONFromNDJSON, fetchOverpassData, loadBoundariesFromCSV, updateIndexJson, fetchGeoJSONFromArcGIS, fetchCountyPopulationsByState, buildCountyUrl, buildCountySubdivisionUrl, fetchCountySubdivisionPopulations, buildZctaUrl, fetchZctaPopulations, isValidCountySubdivision, STATES_USING_CITIES_AS_COUSUBS, buildPlacesQuery, fetchPlacePopulations } from './utils/script-utils.ts';

import minimist from 'minimist';
import { BoundaryBox, filterAndClipRegionsToBoundary, attachRegionPopulationData } from './utils/geometry.ts';


// Usage: npx tsx scripts/extract-map-features.ts --input=england_districts.geojson [--south=.. --west=.. --north=.. --east=..]

type Args = {
  dataType: string;
  cityCode: string;
  countryCode: string;
  south?: number;
  west?: number;
  north?: number;
  east?: number;
}

const AVAILABLE_COUNTRY_CODES = new Set(['GB', 'US']);
const OUTPUT_INDEX_FILE = path.resolve('data', 'index.json');
const BOUNDARIES_INDEX_FILE = path.resolve('source_data', 'boundaries.csv');

/* --- GB DATA --- */

const GB_SUPPORTED_DATA_TYPES = new Set(['districts', 'bua', 'wards']);

/* --- Local Authority Districts (LAD) ---
  Source: https://geoportal.statistics.gov.uk/datasets/ons::local-authority-districts-may-2025-boundaries-uk-bfc-v2/about
  Resolution: Full resolution (clipped to coastline)
*/
const GB_DISTRICT_BOUNDARIES = 'gb_district_boundaries.geojson';
const GB_DISTRICT_POPULATIONS = 'gb_district_populations.csv';

const DISTRICT_CODE_PROPERTY = 'LAD25CD';
const DISTRICT_NAME_PROPERTY = 'LAD25NM';
const DISTRICT_WELSH_NAME_PROPERTY = 'LAD25NMW';

/* --- Built-Up Areas (BUA) ---
   Source: https://geoportal.statistics.gov.uk/datasets/ons::built-up-areas-december-2022-boundaries-gb-bgg/about
   Note: Missing Northern Ireland BUAs
   Resolution: 25m grid squares
*/
const GB_BUA_BOUNDARIES = 'gb_bua_boundaries.geojson';
const GB_BUA_POPULATIONS = 'gb_bua_populations.csv';

const BUA_CODE_PROPERTY = 'BUA22CD';
const BUA_NAME_PROPERTY = 'BUA22NM';
const BUA_WELSH_NAME_PROPERTY = 'BUA22NMW';
const BUA_GAELIC_NAME_PROPERTY = 'BUA22NMG';

/* --- Wards (Electoral Divisions) ---
  Source: https://geoportal.statistics.gov.uk/datasets/ons::wards-may-2025-boundaries-uk-bfc-v2-1/about
  Resolution: Full resolution (clipped to coastline)
*/
const GB_WARD_BOUNDARIES = 'gb_ward_boundaries.ndjson';
const GB_WARD_POPULATIONS = 'gb_ward_populations.csv'; // Out of date; should be updated

const WARD_CODE_PROPERTY = 'WD25CD';
const WARD_NAME_PROPERTY = 'WD25NM';
const WARD_WELSH_NAME_PROPERTY = 'WD25NMW';


/* --- US DATA --- */

const US_SUPPORTED_DATA_TYPES = new Set(['counties', 'county-subdivisions', 'zctas', 'neighborhoods']);

// Neighborhood data is queried from OpenStreetMap Overpass API based on admin level
const US_NEIGHBORHOOD_ADMIN_LEVEL = 10;
// Other data is queried from Census API

const QUERY_LAT_LNG_BUFFER = 0.01; // Buffer to add around bbox when querying Overpass API

/* --- MAIN LOGIC --- */

function parseArgs(): Args {

  let argv = minimist(process.argv.slice(2), {
    string: ['data-type', 'city-code', 'country-code'],
    alias: {
      dataType: 'data-type',
      cityCode: 'city-code',
    },
  });

  const dataType: string = requireString(argv.dataType, 'data-type');
  const cityCode: string = requireString(argv.cityCode, 'city-code');
  const countryCode: string = requireString(argv.countryCode, 'country-code');

  if (!AVAILABLE_COUNTRY_CODES.has(countryCode)) {
    console.error(`Unsupported country code: ${countryCode}, supported codes are: ${Array.from(AVAILABLE_COUNTRY_CODES).join(', ')}`);
    process.exit(1);
  }

  const south = argv['south'] as number | undefined;
  const west = argv['west'] as number | undefined;
  const north = argv['north'] as number | undefined;
  const east = argv['east'] as number | undefined;

  console.log('Parsed arguments:', { "data-type": dataType, countryCode: countryCode, cityCode: cityCode, south: south, west: west, north: north, east: east });

  return {
    dataType: dataType!,
    cityCode: cityCode!,
    countryCode: countryCode!,
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



async function extractBoundaries(args: Args): Promise<void> {

  // Default map boundaries for all cities, loaded from CSV
  const cityMapBoundaries = loadBoundariesFromCSV(BOUNDARIES_INDEX_FILE);

  const existsInputBoundaries = args.south && args.west && args.north && args.east;

  if (!cityMapBoundaries.has(args.cityCode) && !existsInputBoundaries) {
    console.error(`Custom city code: ${args.cityCode} provided without bbox boundaries. Supported codes with default boundaries: ${Array.from(cityMapBoundaries.keys()).join(', ')}`);
    process.exit(1);
  }

  const bbox: BoundaryBox = existsInputBoundaries ? getBboxFromArgs(args) : cityMapBoundaries.get(args.cityCode)!

  switch (args.countryCode) {
    case "GB":
      if (!GB_SUPPORTED_DATA_TYPES.has(args.dataType)) {
        console.error(`Unsupported data type for GB: ${args.dataType}, supported types are: ${Array.from(GB_SUPPORTED_DATA_TYPES).join(', ')}`);
        process.exit(1);
      }
      await extractGBBoundaries(args, bbox);
      break;
    case "US":
      if (!US_SUPPORTED_DATA_TYPES.has(args.dataType)) {
        console.error(`Unsupported data type for US: ${args.dataType}, supported types are: ${Array.from(US_SUPPORTED_DATA_TYPES).join(', ')}`);
        process.exit(1);
      }
      await extractUSBoundaries(args, bbox);
      break;
    default:
      throw new Error(`Boundary extraction for country code: ${args.countryCode} not yet implemented`);
  }
}




async function extractUSBoundaries(args: Args, bbox: BoundaryBox): Promise<void> {

  const queryBbox = {
    south: bbox.south - QUERY_LAT_LNG_BUFFER,
    west: bbox.west - QUERY_LAT_LNG_BUFFER,
    north: bbox.north + QUERY_LAT_LNG_BUFFER,
    east: bbox.east + QUERY_LAT_LNG_BUFFER,
  };

  let geoJson: GeoJSON.FeatureCollection;
  let featureIDProperty: string;
  let featureNameProperty: string;
  let featurePopulationProperty: string | undefined;
  let applicableNameProperties: string[];
  let displayName: string;

  const populationMap = new Map<string, string>()
  const states = new Set<string>()

  switch (args.dataType) {
    case 'counties':
      displayName = "Counties";
      featureIDProperty = 'GEOID'
      featureNameProperty = 'NAME'
      applicableNameProperties = ['NAME'];
      geoJson = await fetchGeoJSONFromArcGIS(buildCountyUrl(queryBbox))
      for (const feature of geoJson.features) {
        const geoid = feature.properties!.GEOID!
        if (typeof geoid === 'string' && geoid.length >= 2) {
          states.add(geoid.slice(0, 2))
        }
      }

      for (const state of Array.from(states)) {
        const statePopMap = await fetchCountyPopulationsByState(state)
        statePopMap.forEach((v, k) => populationMap.set(k, v))
      }

      break;
    case 'county-subdivisions':
      displayName = "County Subdivisions";
      featureIDProperty = 'GEOID'
      featureNameProperty = 'NAME'
      applicableNameProperties = ['BASENAME', 'NAME'];
      let couSubStates = new Set<string>()
      let couSubGeoJson = await fetchGeoJSONFromArcGIS(buildCountySubdivisionUrl(queryBbox))
      const filteredFeatures = couSubGeoJson.features.filter(f => {
        return isValidCountySubdivision(f.properties!.NAME!, f.properties!.COUSUBFP) &&
          STATES_USING_CITIES_AS_COUSUBS.has(f.properties!.STATE!)
      })
      filteredFeatures.forEach(f => {
        couSubStates.add(f.properties!.STATE!)
      })
      for (const state of Array.from(couSubStates)) {
        const m = await fetchCountySubdivisionPopulations(state)
        m.forEach((v, k) => populationMap.set(k, v))
      }
      let placesStates = new Set<string>()

      let cdpGeoJson = await fetchGeoJSONFromArcGIS(buildPlacesQuery(queryBbox, 5))
      let citiesGeoJson = await fetchGeoJSONFromArcGIS(buildPlacesQuery(queryBbox, 4))
      let consolidatedCitiesGeoJson = await fetchGeoJSONFromArcGIS(buildPlacesQuery(queryBbox, 3))

      let concatenatedFeatures = [
        ...cdpGeoJson.features,
        ...citiesGeoJson.features,
        ...consolidatedCitiesGeoJson.features
      ]
      const filteredPlaceFeatures = concatenatedFeatures.filter(f => {
        return !STATES_USING_CITIES_AS_COUSUBS.has(f.properties!.STATE!)
      })
      filteredPlaceFeatures.forEach(f => {
        placesStates.add(f.properties!.STATE!)
      })
      for (const state of Array.from(placesStates)) {
        const m = await fetchPlacePopulations(state)
        m.forEach((v, k) => populationMap.set(k, v))
      }
      geoJson = {
        type: 'FeatureCollection',
        features: [
          ...filteredFeatures,
          ...filteredPlaceFeatures
        ]
      }
      break;
    case 'zctas':
      displayName = "ZIP Code Tabulation Areas";
      featureIDProperty = 'GEOID'
      featureNameProperty = 'NAME'
      applicableNameProperties = ['BASENAME', 'NAME'];
      geoJson = await fetchGeoJSONFromArcGIS(buildZctaUrl(queryBbox))
      const zctaPopMap = await fetchZctaPopulations()
      zctaPopMap.forEach((v, k) => populationMap.set(k, v))
      break;
    case 'neighborhoods':
      const adminLevel = US_NEIGHBORHOOD_ADMIN_LEVEL;
      const query = `
        [out:json][timeout:60];
        (
          relation["boundary"="administrative"]["admin_level"="${adminLevel}"](${queryBbox.south},${queryBbox.west},${queryBbox.north},${queryBbox.east});
        );
        out geom;
      `;
      const overpassJson = await fetchOverpassData(query);
      geoJson = osmtogeojson(overpassJson);
      displayName = "Neighborhoods";
      featureNameProperty = 'name';
      applicableNameProperties = ['name'];
      featureIDProperty = 'id';
      featurePopulationProperty = 'population';
      console.log(`Loaded ${geoJson.features.length} features from queries.`);
      break;
    default:
      throw new Error(`Unsupported data type for US: ${args.dataType}`);
  }

  console.log(`Loaded population data for ${populationMap.size} regions.`);

  const filteredRegions = filterAndClipRegionsToBoundary(
    geoJson as GeoJSON.FeatureCollection,
    bbox,
    featureIDProperty,
    featureNameProperty,
    applicableNameProperties,
    featurePopulationProperty
  );

  attachRegionPopulationData(
    filteredRegions,
    populationMap,
    'ID'
  )

  if (!filteredRegions || filteredRegions.length === 0) {
    console.warn(`No features found for ${displayName} within specified boundary box.`);
    return;
  }

  console.log(`Filtered to ${filteredRegions.length} features within boundary box.`);

  saveBoundaries(args, filteredRegions, displayName);
}

async function extractGBBoundaries(args: Args, bbox: BoundaryBox): Promise<void> {

  let geojsonFile: string;
  let populationFile: string;

  let boundaryIDProperty: string;
  let boundaryNameProperty: string;
  let boundaryWelshNameProperty: string;
  let boundaryGaelicNameProperty: string | null = null;

  let displayName: string;
  let streamData: boolean = false;

  if (args.dataType === 'districts') {
    geojsonFile = path.resolve('source_data', GB_DISTRICT_BOUNDARIES);
    populationFile = path.resolve('source_data', GB_DISTRICT_POPULATIONS);
    boundaryIDProperty = DISTRICT_CODE_PROPERTY;
    boundaryNameProperty = DISTRICT_NAME_PROPERTY;
    boundaryWelshNameProperty = DISTRICT_WELSH_NAME_PROPERTY;
    displayName = "Districts";
  } else if (args.dataType === 'bua') {
    geojsonFile = path.resolve('source_data', GB_BUA_BOUNDARIES);
    populationFile = path.resolve('source_data', GB_BUA_POPULATIONS);
    boundaryIDProperty = BUA_CODE_PROPERTY;
    boundaryNameProperty = BUA_NAME_PROPERTY;
    boundaryWelshNameProperty = BUA_WELSH_NAME_PROPERTY;
    boundaryGaelicNameProperty = BUA_GAELIC_NAME_PROPERTY;
    displayName = "Built-Up Areas";
  } else if (args.dataType === 'wards') {
    geojsonFile = path.resolve('source_data', GB_WARD_BOUNDARIES);
    populationFile = path.resolve('source_data', GB_WARD_POPULATIONS);
    boundaryIDProperty = WARD_CODE_PROPERTY;
    boundaryNameProperty = WARD_NAME_PROPERTY;
    boundaryWelshNameProperty = WARD_WELSH_NAME_PROPERTY;
    displayName = "Electoral Wards";
    streamData = true;
  } else {
    throw new Error(`Unsupported data type for EW: ${args.dataType}, supported types are: ${Array.from(GB_SUPPORTED_DATA_TYPES).join(', ')}`);
  }

  const boundaries: GeoJSON.FeatureCollection = streamData ? await loadGeoJSONFromNDJSON(geojsonFile) : loadGeoJSON(geojsonFile);

  console.log(`Loaded ${boundaries.features.length} features.`);

  const applicableNameProperties: string[] = [boundaryWelshNameProperty, boundaryNameProperty];
  if (boundaryGaelicNameProperty !== null) {
    applicableNameProperties.unshift(boundaryGaelicNameProperty);
  }

  const populationCharacteristics: Row[] = loadCSV(populationFile);
  const populationIndex: Map<string, string> = buildCSVIndex(populationCharacteristics, 'Code', 'Population');

  console.log(`Loaded population data for ${populationIndex.size} regions.`);

  const filteredRegions = filterAndClipRegionsToBoundary(
    boundaries,
    bbox,
    boundaryIDProperty,
    boundaryNameProperty,
    // Prefer Welsh/Gaelic name if available for display
    applicableNameProperties,
  );

  if (!filteredRegions || filteredRegions.length === 0) {
    console.warn(`No features found for ${displayName} within specified boundary box.`);
    return;
  }

  console.log(`Filtered to ${filteredRegions.length} features within boundary box.`);

  attachRegionPopulationData(
    filteredRegions,
    populationIndex,
    'ID'
  )

  saveBoundaries(args, filteredRegions, displayName);
}

function saveBoundaries(args: Args, filteredRegions: GeoJSON.Feature[], displayName: string) {
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

  updateIndexJson(
    OUTPUT_INDEX_FILE,
    args.cityCode,
    args.dataType,
    displayName
  );
}

function main(): void {
  const args: Args = parseArgs();
  extractBoundaries(args);
}

main();
