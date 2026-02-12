import path from 'path';

import { SOURCE_DATA_DIR } from '../../shared/consts';
import type { ExtractMapFeaturesArgs } from '../utils/cli';
import type { Row } from '../utils/files';
import {
  buildCSVIndex,
  loadCSV,
  loadGeoJSON,
  loadGeoJSONFromNDJSON,
} from '../utils/files';
import type { BoundaryBox } from '../utils/geometry';
import { expandBBox } from '../utils/geometry';
import {
  fetchGeoJSONFromArcGIS,
  getBUAONSQuery,
  getDistrictONSQuery,
  getWardONSQuery,
} from '../utils/queries';
import type { BoundaryDataHandler, DataConfig } from './handler-types';
import { processAndSaveBoundaries } from './process';

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

const GB_DATA_CONFIGS: Record<string, DataConfig> = {
  districts: {
    displayName: 'Districts',
    idProperty: DISTRICT_CODE_PROPERTY,
    nameProperty: DISTRICT_NAME_PROPERTY,
    applicableNameProperties: [
      DISTRICT_WELSH_NAME_PROPERTY,
      DISTRICT_NAME_PROPERTY,
    ],
    populationProperty: 'Population',
  },
  bua: {
    displayName: 'Built-Up Areas',
    idProperty: BUA_CODE_PROPERTY,
    nameProperty: BUA_NAME_PROPERTY,
    applicableNameProperties: [
      BUA_WELSH_NAME_PROPERTY,
      BUA_GAELIC_NAME_PROPERTY,
      BUA_NAME_PROPERTY,
    ],
    populationProperty: 'Population',
  },
  wards: {
    displayName: 'Electoral Wards',
    idProperty: WARD_CODE_PROPERTY,
    nameProperty: WARD_NAME_PROPERTY,
    applicableNameProperties: [WARD_WELSH_NAME_PROPERTY, WARD_NAME_PROPERTY],
    populationProperty: 'Population',
  },
};

const GB_BOUNDARY_DATA_HANDLERS: Record<string, BoundaryDataHandler> = {
  districts: {
    dataConfig: GB_DATA_CONFIGS['districts'],
    extractBoundaries: async (bbox: BoundaryBox, useLocalData?: boolean) =>
      extractDistrictBoundaries(bbox, useLocalData),
  },
  bua: {
    dataConfig: GB_DATA_CONFIGS['bua'],
    extractBoundaries: async (bbox: BoundaryBox, useLocalData?: boolean) =>
      extractBUABoundaries(bbox, useLocalData),
  },
  wards: {
    dataConfig: GB_DATA_CONFIGS['wards'],
    extractBoundaries: async (bbox: BoundaryBox, useLocalData?: boolean) =>
      extractWardBoundaries(bbox, useLocalData),
  },
};

async function extractDistrictBoundaries(
  bbox: BoundaryBox,
  useLocal: boolean = false,
) {
  const boundaries: GeoJSON.FeatureCollection = useLocal
    ? loadGeoJSON(path.resolve(SOURCE_DATA_DIR, GB_DISTRICT_BOUNDARIES))
    : await fetchGeoJSONFromArcGIS(getDistrictONSQuery(bbox));
  const populationCharacteristics: Row[] = loadCSV(
    path.resolve(SOURCE_DATA_DIR, GB_DISTRICT_POPULATIONS),
  );
  const populationIndex: Map<string, string> = buildCSVIndex(
    populationCharacteristics,
    'Code',
    'Population',
  );
  return { geoJson: boundaries, populationMap: populationIndex };
}

async function extractBUABoundaries(
  bbox: BoundaryBox,
  useLocal: boolean = false,
) {
  const boundaries: GeoJSON.FeatureCollection = useLocal
    ? loadGeoJSON(path.resolve(SOURCE_DATA_DIR, GB_BUA_BOUNDARIES))
    : await fetchGeoJSONFromArcGIS(getBUAONSQuery(bbox));
  const populationCharacteristics: Row[] = loadCSV(
    path.resolve(SOURCE_DATA_DIR, GB_BUA_POPULATIONS),
  );
  const populationIndex: Map<string, string> = buildCSVIndex(
    populationCharacteristics,
    'Code',
    'Population',
  );
  return { geoJson: boundaries, populationMap: populationIndex };
}

async function extractWardBoundaries(
  bbox: BoundaryBox,
  useLocal: boolean = false,
) {
  const boundaries: GeoJSON.FeatureCollection = useLocal
    ? await loadGeoJSONFromNDJSON(
        path.resolve(SOURCE_DATA_DIR, GB_WARD_BOUNDARIES),
      )
    : await fetchGeoJSONFromArcGIS(getWardONSQuery(bbox));
  console.log(boundaries.features[0]);
  const populationCharacteristics: Row[] = loadCSV(
    path.resolve(SOURCE_DATA_DIR, GB_WARD_POPULATIONS),
  );
  const populationIndex: Map<string, string> = buildCSVIndex(
    populationCharacteristics,
    'Code',
    'Population',
  );
  return { geoJson: boundaries, populationMap: populationIndex };
}

export async function extractGBBoundaries(
  args: ExtractMapFeaturesArgs,
  bbox: BoundaryBox,
): Promise<void> {
  const handler = GB_BOUNDARY_DATA_HANDLERS[args.dataType];
  if (!handler) {
    throw new Error(`Unsupported data type for GB: ${args.dataType}`);
  }
  const { geoJson, populationMap } = await handler.extractBoundaries(
    expandBBox(bbox, 0.01),
    args.useLocalData,
  );

  processAndSaveBoundaries(
    geoJson,
    populationMap,
    bbox,
    args,
    handler.dataConfig,
    'GB',
  );
}
