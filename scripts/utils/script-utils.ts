import fs from 'fs-extra';
import path from 'path';
import readline from "readline";
import { parse } from 'csv-parse/sync';
import { BoundaryBox } from '../../src/core/datasets';
import { arcgisToGeoJSON } from '@terraformer/arcgis'

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const TIGERWEB_API_URL = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';
const ACS_API_URL = 'https://api.census.gov/data/2022/acs/acs5';

export const STATES_USING_CITIES_AS_COUSUBS = new Set([
  '09', '23', '25', '33', '44', '50', // New England
  '34', '42', // NJ, PA
  '17', '18', '19', '20', '26', '27', '29', '31', '38', '39', '46', '55', // Midwest
])

export type Row = Record<string, string>;

type ArcGisQueryRequest = {
  url: string
  params: URLSearchParams
}

// ===== Argument Validation =====

export function requireString(
  value: any,
  name: string
): string {
  if (typeof value !== 'string' || value.length === 0) {
    console.error(`Missing or invalid argument: --${name}`);
    process.exit(1);
  }
  return value;
}

export function requireNumber(
  value: any,
  name: string
): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  console.error(`Missing or invalid argument: --${name}`);
  process.exit(1);
}

// ===== File Operations =====

export function validateFilePath(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    console.error(`Input file does not exist: ${filePath}`);
    process.exit(1);
  }
}

export function loadGeoJSON(filePath: string): GeoJSON.FeatureCollection {
  validateFilePath(filePath);
  let geoJson: GeoJSON.FeatureCollection;
  try {
    const loadedJson = fs.readJsonSync(filePath);
    geoJson = loadedJson as GeoJSON.FeatureCollection;
  } catch (err: any) {
    console.error(`Failed to load or parse GeoJSON file: ${filePath} with error: ${err.message}`);
    process.exit(1);
  }

  return geoJson;
}

export async function loadGeoJSONFromNDJSON(
  filePath: string
): Promise<GeoJSON.FeatureCollection> {
  validateFilePath(filePath);

  const features: GeoJSON.Feature[] = new Array<GeoJSON.Feature>();
  await loadFeatureFromNDJSON(filePath, (f) => features.push(f));

  return {
    type: "FeatureCollection",
    features: features
  };
}

async function loadFeatureFromNDJSON(
  filePath: string,
  onFeature: (f: GeoJSON.Feature) => void
): Promise<void> {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    onFeature(JSON.parse(line) as GeoJSON.Feature);
  }
}

export function saveGeoJSON(
  filePath: string,
  featureCollection: GeoJSON.FeatureCollection
): void {
  try {
    console.info(`Saving GeoJSON to: ${filePath}`);
    const saveDirectory = path.dirname(filePath);

    // Ensure directory exists
    fs.ensureDirSync(saveDirectory);
    fs.writeJsonSync(`${filePath}.tmp`, featureCollection, { spaces: 2 });
    fs.moveSync(`${filePath}.tmp`, filePath, { overwrite: true });

    console.info(`Saved GeoJSON to: ${filePath}`);
  } catch (err) {
    console.error(`Failed to save GeoJSON to: ${filePath} with error: ${err}`);
    process.exit(1);
  }
}

export function buildCSVIndex(rows: Row[], keyColumn: string, valueColumn: string): Map<string, string> {
  const index = new Map<string, string>();

  for (const row of rows) {
    const key = row[keyColumn];
    const value = row[valueColumn];
    if (key && value) {
      index.set(key, value);
    }
  }
  return index;
}

export function loadCSV(filePath: string): Array<Row> {
  validateFilePath(filePath);
  const csvContent: string = fs.readFileSync(filePath, 'utf8');
  const records: Row[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  return records;
}

export function loadBoundariesFromCSV(inputPath: string): Map<string, BoundaryBox> {
  const boundaries = new Map<string, BoundaryBox>();
  const rows = loadCSV(inputPath);

  for (const row of rows) {
    const code = row['Code'];
    const south = parseFloat(row['South']);
    const west = parseFloat(row['West']);
    const north = parseFloat(row['North']);
    const east = parseFloat(row['East']);

    if (code && !isNaN(south) && !isNaN(west) && !isNaN(north) && !isNaN(east)) {
      boundaries.set(code, { south, west, north, east });
    }
  }
  console.log(`Loaded ${boundaries.size} city boundaries from CSV.`);
  return boundaries;
}

export function updateIndexJson(indexPath: string, cityCode: string, dataType: string, displayName: string): void {
  validateFilePath(indexPath);
  const index = fs.readJsonSync(indexPath, { throws: false }) || {};

  if (!index[cityCode]) {
    index[cityCode] = [];
  }

  const existingEntry = index[cityCode].find((entry: any) => entry.id === dataType);
  if (!existingEntry) {
    index[cityCode].push({ id: dataType, name: displayName });
    fs.writeJsonSync(indexPath, index, { spaces: 2 });
    console.log(`Updated index.json for ${cityCode} with new dataset: ${displayName}`);
  } else {
    console.log(`Dataset ${displayName} already exists in index.json for ${cityCode}.`);
  }
}

// ===== Overpass API =====

export async function fetchOverpassData(query: string): Promise<any> {
  console.log('Querying Overpass API...');
  const response = await fetch(OVERPASS_API_URL, {
    method: 'POST',
    body: query
  });
  if (!response.ok) {
    throw new Error(`Overpass API query failed: ${response.statusText}`);
  }
  return await response.json();
}

// ===== Census API =====

function isFeatureCollection(
  geoJson: GeoJSON.GeoJSON
): geoJson is GeoJSON.FeatureCollection {
  return geoJson.type === 'FeatureCollection'
}

export function isValidCountySubdivision(
    name: string,
    cousubfp?: string
): boolean {
  if (cousubfp === '00000') return false
  if (
    name &&
    name.toLowerCase() === 'county subdivisions not defined'
  ) {
    return false
  }
  return true
}

function bboxToGeometryString(bbox: BoundaryBox): string {
  return `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
}

export function buildCountyUrl(queryBbox: BoundaryBox): ArcGisQueryRequest {
  return {
    url: `${TIGERWEB_API_URL}/State_County/MapServer/1/query`, 
    params: new URLSearchParams({
    where: '1=1',
    geometry: bboxToGeometryString(queryBbox),
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    outFields: 'GEOID,NAME',
    returnGeometry: 'true',
    f: 'json'
  })}
}

export function buildCountySubdivisionUrl(queryBbox: BoundaryBox): ArcGisQueryRequest {
  return {
    url: `${TIGERWEB_API_URL}/Places_CouSub_ConCity_SubMCD/MapServer/1/query`, 
    params:  new URLSearchParams({
    where: '1=1',
    geometry: bboxToGeometryString(queryBbox),
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outSR: '4326',
    outFields: '*',
    returnGeometry: 'true',
    f: 'json',
  })}
}

export function buildPlacesQuery(queryBbox: BoundaryBox, layerId: number): ArcGisQueryRequest {
  return {
    url:
      `${TIGERWEB_API_URL}/Places_CouSub_ConCity_SubMCD/MapServer/${layerId}/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: bboxToGeometryString(queryBbox),
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      inSR: '4326',
      outSR: '4326',
      outFields: '*',
      returnGeometry: 'true',
      f: 'json',
    }),
  }
}

export function buildZctaUrl(queryBbox: BoundaryBox): ArcGisQueryRequest {
  return {url: `${TIGERWEB_API_URL}/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query`, params: new URLSearchParams({
    where: '1=1',
    geometry: `${queryBbox.west},${queryBbox.south},${queryBbox.east},${queryBbox.north}`,
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outSR: '4326',
    outFields: '*',
    returnGeometry: 'true',
    f: 'json'
  })}
}

export async function fetchGeoJSONFromArcGIS(request: ArcGisQueryRequest): Promise<GeoJSON.FeatureCollection> {
  console.log('Querying ArcGIS API:', request.url);
  const res = await fetch(request.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: request.params.toString(),
  })
  if (!res.ok) {
    throw new Error(`ArcGIS query failed: ${res.statusText}`)
  }

  const arcgisJson = await res.json()
  if (arcgisJson.error) {
    throw new Error(
      `ArcGIS query failed: ${arcgisJson.error.message}`
    )
  }

  console.log(`Fetched ${arcgisJson.features.length} features from Census API.`)
  const geoJson: GeoJSON.GeoJSON = arcgisToGeoJSON(arcgisJson)
  if (!isFeatureCollection(geoJson)) {
    throw new Error(`Expected FeatureCollection, got ${geoJson.type}`)
  }
  return geoJson
}

export async function fetchCountyPopulationsByState(state: string): Promise<Map<string, string>> {

  // Use 2022 ACS data as prior to that date, there were no county-equivalent population data available for the state
  const url = new URL(ACS_API_URL)

  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'county:*',
    in: `state:${state}`
  }).toString()

  const res = await fetch(url)
  const rows = await res.json()

  // First row is headers
  const [, ...data] = rows

  const map = new Map<string, string>()

  for (const [population, state, county] of data) {
    const geoid = `${state}${county}`
    map.set(geoid, population)
  }

  return map
}

export async function fetchCountySubdivisionPopulations(
  state: string,
): Promise<Map<string, string>> {

  const url = new URL(ACS_API_URL)
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'county subdivision:*',
    in: `state:${state}`
  }).toString()

  const res = await fetch(url)
  const rows: string[][] = await res.json()

  const [, ...data] = rows
  const map = new Map<string, string>()

  for (const [population, stateFP, countyFP, cousub] of data) {
    const geoid = `${stateFP}${countyFP}${cousub}`
    map.set(geoid, population)
  }

  return map
}

export async function fetchPlacePopulations(
  state: string,
): Promise<Map<string, string>> {

  const url = new URL(ACS_API_URL)
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'place:*',
    in: `state:${state}`
  }).toString()

  const res = await fetch(url)
  const rows: string[][] = await res.json()

  const [, ...data] = rows
  const map = new Map<string, string>()

  for (const [population, stateFP, placeFP] of data) {
    const geoid = `${stateFP}${placeFP}`
    map.set(geoid, population)
  }

  return map
}

export async function fetchZctaPopulations(): Promise<Map<string, string>> {
  const url = new URL(ACS_API_URL)
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'zip code tabulation area:*'
  }).toString()

  const res = await fetch(url)
  const rows: string[][] = await res.json()

  const [, ...data] = rows
  const map = new Map<string, string>()

  for (const [population, zcta] of data) {
    map.set(zcta, population)
  }

  return map
}

