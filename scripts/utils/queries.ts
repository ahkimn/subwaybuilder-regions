import { arcgisToGeoJSON } from "@terraformer/arcgis";
import { bboxToGeometryString, BoundaryBox, isFeatureCollection } from "./geometry";

export const TIGERWEB_API_URL = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';
export const ACS_API_URL = 'https://api.census.gov/data/2022/acs/acs5';

// List of states (by FIPS code) where cities or towns are used as county subdivisions in Census data, rather than minor civil divisions.
export const STATES_USING_CITIES_AS_COUNTY_SUBDIVISIONS = new Set([
  '09', '23', '25', '33', '44', '50', // New England
  '34', '42', // NJ, PA
  '17', '18', '19', '20', '26', '27', '29', '31', '38', '39', '46', '55', // Midwest
]);

// Neighborhood data is queried from OpenStreetMap Overpass API based on admin level
const US_NEIGHBORHOOD_ADMIN_LEVEL = 10;

export type ArcGisQueryRequest = {
  url: string;
  params: URLSearchParams;
};

// --- Helpers --- //

export function isValidCountySubdivision(
  name: string,
  cousubfp?: string
): boolean {
  if (cousubfp === '00000') return false;
  if (name &&
    name.toLowerCase() === 'county subdivisions not defined') {
    return false;
  }
  return true;
}


// --- Census Boundary Queries --- //

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
    })
  };
}

export function buildCountySubdivisionUrl(queryBbox: BoundaryBox): ArcGisQueryRequest {
  return {
    url: `${TIGERWEB_API_URL}/Places_CouSub_ConCity_SubMCD/MapServer/1/query`,
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
    })
  };
}

export function buildPlacesQuery(queryBbox: BoundaryBox, layerId: number): ArcGisQueryRequest {
  return {
    url: `${TIGERWEB_API_URL}/Places_CouSub_ConCity_SubMCD/MapServer/${layerId}/query`,
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
  };
}

export function buildZctaUrl(queryBbox: BoundaryBox): ArcGisQueryRequest {
  return {
    url: `${TIGERWEB_API_URL}/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query`, params: new URLSearchParams({
      where: '1=1',
      geometry: `${queryBbox.west},${queryBbox.south},${queryBbox.east},${queryBbox.north}`,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      inSR: '4326',
      outSR: '4326',
      outFields: '*',
      returnGeometry: 'true',
      f: 'json'
    })
  };
}

export async function fetchCouSubFeatures(bbox: BoundaryBox): Promise<GeoJSON.Feature[]> {

  const couSubGeoJson = await fetchGeoJSONFromArcGIS(buildCountySubdivisionUrl(bbox))

  return couSubGeoJson.features.filter(
    f => isValidCountySubdivision(f.properties!.NAME!, f.properties!.COUSUBFP)
      && STATES_USING_CITIES_AS_COUNTY_SUBDIVISIONS.has(f.properties!.STATE!)
  );
}

export async function fetchPlaceFeatures(bbox: BoundaryBox): Promise<GeoJSON.Feature[]> {
  let cdpGeoJson = await fetchGeoJSONFromArcGIS(buildPlacesQuery(bbox, 5))
  let citiesGeoJson = await fetchGeoJSONFromArcGIS(buildPlacesQuery(bbox, 4))
  let consolidatedCitiesGeoJson = await fetchGeoJSONFromArcGIS(buildPlacesQuery(bbox, 3))

  let concatenatedFeatures = [
    ...cdpGeoJson.features,
    ...citiesGeoJson.features,
    ...consolidatedCitiesGeoJson.features
  ]
  return concatenatedFeatures.filter(f => {
    return !STATES_USING_CITIES_AS_COUNTY_SUBDIVISIONS.has(f.properties!.STATE!)
  });
}

export async function fetchGeoJSONFromArcGIS(request: ArcGisQueryRequest): Promise<GeoJSON.FeatureCollection> {
  console.log('Querying ArcGIS API:', request.url);
  const res = await fetch(request.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: request.params.toString(),
  });
  if (!res.ok) {
    throw new Error(`ArcGIS query failed: ${res.statusText}`);
  }

  const arcgisJson = await res.json();
  if (arcgisJson.error) {
    throw new Error(
      `ArcGIS query failed: ${arcgisJson.error.message}`
    );
  }

  console.log(`Fetched ${arcgisJson.features.length} features from Census API.`);
  const geoJson: GeoJSON.GeoJSON = arcgisToGeoJSON(arcgisJson);
  if (!isFeatureCollection(geoJson)) {
    throw new Error(`Expected FeatureCollection, got ${geoJson.type}`);
  }
  return geoJson;
}

// --- Census Population Queries --- //

export async function fetchCountyPopulations(states: Set<string>): Promise<Map<string, string>> {

  const populationMap = new Map<string, string>()
  for (const state of states) {
    const statePopMap = await fetchCountyPopulationsByState(state)
    statePopMap.forEach((v, k) => populationMap.set(k, v))


  }
  return populationMap;
}

async function fetchCountyPopulationsByState(state: string): Promise<Map<string, string>> {

  // Use 2022 ACS data as prior to that date, there were no county-equivalent population data available for the state
  const url = new URL(ACS_API_URL);

  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'county:*',
    in: `state:${state}`
  }).toString();

  const res = await fetch(url);
  const rows = await res.json();

  // First row is headers
  const [, ...data] = rows;

  const map = new Map<string, string>();

  for (const [population, state, county] of data) {
    const geoid = `${state}${county}`;
    map.set(geoid, population);
  }

  return map;
}

export async function fetchCountySubdivisionPopulations(
  state: string
): Promise<Map<string, string>> {

  const url = new URL(ACS_API_URL);
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'county subdivision:*',
    in: `state:${state}`
  }).toString();

  const res = await fetch(url);
  const rows: string[][] = await res.json();

  const [, ...data] = rows;
  const map = new Map<string, string>();

  for (const [population, stateFP, countyFP, cousub] of data) {
    const geoid = `${stateFP}${countyFP}${cousub}`;
    map.set(geoid, population);
  }

  return map;
}

export async function fetchPlacePopulations(
  state: string
): Promise<Map<string, string>> {

  const url = new URL(ACS_API_URL);
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'place:*',
    in: `state:${state}`
  }).toString();

  const res = await fetch(url);
  const rows: string[][] = await res.json();

  const [, ...data] = rows;
  const map = new Map<string, string>();

  for (const [population, stateFP, placeFP] of data) {
    const geoid = `${stateFP}${placeFP}`;
    map.set(geoid, population);
  }

  return map;
}

export async function fetchZctaPopulations(): Promise<Map<string, string>> {
  const url = new URL(ACS_API_URL);
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'zip code tabulation area:*'
  }).toString();

  const res = await fetch(url);
  const rows: string[][] = await res.json();

  const [, ...data] = rows;
  const map = new Map<string, string>();

  for (const [population, zcta] of data) {
    map.set(zcta, population);
  }

  return map;
}

// --- Census Data Helpers --- //

export function extractStateCodesFromGeoIDs(features: GeoJSON.Feature[]): Set<string> {
  const states = new Set<string>();
  for (const feature of features) {
    const geoid = feature.properties!.GEOID!
    if (typeof geoid === 'string' && geoid.length >= 2) {
      states.add(geoid.slice(0, 2))
    }
  }
  return states;
}


// --- Overpass API --- //

export function buildNeighborhoodOverpassQuery(bbox: BoundaryBox): string {
  return `
        [out:json][timeout:60];
        (
          relation["boundary"="administrative"]["admin_level"="${US_NEIGHBORHOOD_ADMIN_LEVEL}"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        );
        out geom;
      `;
}

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
} export const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';




