import { arcgisToGeoJSON } from '@terraformer/arcgis';

import type { BoundaryBox } from './geometry';
import { bboxToGeometryString, isFeatureCollection } from './geometry';
import { fetchJsonWithRetry } from './http';

const TIGERWEB_API_BASE_URL =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';
const ACS_API_URL = 'https://api.census.gov/data/2022/acs/acs5';
const ONS_API_BASE_URL =
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';
const CA_STATCAN_BASE_URL =
  'https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/';
const IGN_ADMIN_WFS_BASE_URL = 'https://data.geopf.fr/wfs/wfs';

// List of states (by FIPS code) where cities or towns are used as county subdivisions in Census data, rather than minor civil divisions.
export const STATES_USING_CITIES_AS_COUNTY_SUBDIVISIONS = new Set([
  '09',
  '23',
  '25',
  '33',
  '44',
  '50', // New England
  '34',
  '42', // NJ, PA
  '17',
  '18',
  '19',
  '20',
  '26',
  '27',
  '29',
  '31',
  '38',
  '39',
  '46',
  '55', // Midwest
]);

export type ArcGISQueryRequest = {
  url: string;
  params: URLSearchParams;
};

export type WFSQueryRequest = {
  url: string;
  params: URLSearchParams;
};

export type ArcGISFetchOptions = {
  featureType?: string;
};

export type WFSFetchOptions = {
  featureType?: string;
};

type ArcGISErrorResponse = {
  error?: {
    message?: string;
  };
};

type OverpassApiResponse = {
  elements: unknown[];
  [key: string]: unknown;
};

// --- Helpers --- //

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringMatrix(value: unknown): value is string[][] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        Array.isArray(row) && row.every((column) => typeof column === 'string'),
    )
  );
}

function isArcGISErrorResponse(value: unknown): value is ArcGISErrorResponse {
  return isObject(value) && isObject(value.error);
}

function isArcGISFeatureResponse(
  value: unknown,
): value is { features: Array<{ attributes?: Record<string, unknown> }> } {
  if (!isObject(value) || !Array.isArray(value.features)) {
    return false;
  }

  if (value.features.length === 0) {
    return true;
  }

  const firstFeature = value.features[0]; // Validate based on the shape of first feature
  return isObject(firstFeature) && isObject(firstFeature.attributes);
}

function isRawFeatureCollection(
  value: unknown,
): value is { type: string; features: unknown[] } {
  return (
    isObject(value) &&
    value.type === 'FeatureCollection' &&
    Array.isArray(value.features)
  );
}

function parseACSRows(rows: unknown, endpoint: string): string[][] {
  if (!isStringMatrix(rows) || rows.length < 1) {
    throw new Error(`[ACS] Unexpected response shape for ${endpoint}`);
  }

  return rows;
}

function isOverpassApiResponse(value: unknown): value is OverpassApiResponse {
  return isObject(value) && Array.isArray(value.elements);
}

export function isValidCountySubdivision(
  name: string,
  cousubfp?: string,
): boolean {
  if (cousubfp === '00000') return false;
  if (name && name.toLowerCase() === 'county subdivisions not defined') {
    return false;
  }
  return true;
}

// --- Census Boundary Queries --- //

export function buildCountyUrl(queryBBox: BoundaryBox): ArcGISQueryRequest {
  return {
    url: `${TIGERWEB_API_BASE_URL}/State_County/MapServer/1/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: bboxToGeometryString(queryBBox),
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      outSR: '4326',
      outFields: 'GEOID,NAME,LSADC',
      returnGeometry: 'true',
      f: 'json',
    }),
  };
}

export function bboxToWfsBbox(
  queryBBox: BoundaryBox,
  srs: string = 'EPSG:4326',
): string {
  return `${queryBBox.west},${queryBBox.south},${queryBBox.east},${queryBBox.north},${srs}`;
}

export function buildIgnAdminWfsQuery(
  queryBBox: BoundaryBox,
  typeName:
    | 'ADMINEXPRESS-COG-CARTO.LATEST:departement'
    | 'ADMINEXPRESS-COG-CARTO.LATEST:arrondissement'
    | 'ADMINEXPRESS-COG-CARTO.LATEST:canton'
    | 'ADMINEXPRESS-COG-CARTO.LATEST:epci'
    | 'ADMINEXPRESS-COG-CARTO.LATEST:commune',
): WFSQueryRequest {
  return {
    url: IGN_ADMIN_WFS_BASE_URL,
    params: new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: typeName,
      srsName: 'EPSG:4326',
      outputFormat: 'application/json',
      bbox: bboxToWfsBbox(queryBBox),
    }),
  };
}

export function buildCountySubdivisionUrl(
  queryBBox: BoundaryBox,
): ArcGISQueryRequest {
  return {
    url: `${TIGERWEB_API_BASE_URL}/Places_CouSub_ConCity_SubMCD/MapServer/1/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: bboxToGeometryString(queryBBox),
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

export function buildPlacesQuery(
  queryBBox: BoundaryBox,
  layerId: number,
): ArcGISQueryRequest {
  return {
    url: `${TIGERWEB_API_BASE_URL}/Places_CouSub_ConCity_SubMCD/MapServer/${layerId}/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: bboxToGeometryString(queryBBox),
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

export function buildZctaUrl(queryBBox: BoundaryBox): ArcGISQueryRequest {
  return {
    url: `${TIGERWEB_API_BASE_URL}/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: `${queryBBox.west},${queryBBox.south},${queryBBox.east},${queryBBox.north}`,
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

export async function fetchCouSubFeatures(
  bbox: BoundaryBox,
): Promise<GeoJSON.Feature[]> {
  const couSubGeoJson = await fetchGeoJSONFromArcGIS(
    buildCountySubdivisionUrl(bbox),
    { featureType: 'county subdivisions' },
  );

  return couSubGeoJson.features.filter(
    (f) =>
      isValidCountySubdivision(f.properties!.NAME!, f.properties!.COUSUBFP) &&
      STATES_USING_CITIES_AS_COUNTY_SUBDIVISIONS.has(f.properties!.STATE!),
  );
}

export async function fetchPlaceFeatures(
  bbox: BoundaryBox,
): Promise<GeoJSON.Feature[]> {
  let cdpGeoJson = await fetchGeoJSONFromArcGIS(buildPlacesQuery(bbox, 5), {
    featureType: 'census designated places',
  });
  let citiesGeoJson = await fetchGeoJSONFromArcGIS(buildPlacesQuery(bbox, 4), {
    featureType: 'places',
  });
  let consolidatedCitiesGeoJson = await fetchGeoJSONFromArcGIS(
    buildPlacesQuery(bbox, 3),
    { featureType: 'consolidated cities' },
  );

  let concatenatedFeatures = [
    ...cdpGeoJson.features,
    ...citiesGeoJson.features,
    ...consolidatedCitiesGeoJson.features,
  ];
  return concatenatedFeatures.filter((f) => {
    return !STATES_USING_CITIES_AS_COUNTY_SUBDIVISIONS.has(
      f.properties!.STATE!,
    );
  });
}

function normalizeArcGISResponse(data: unknown): GeoJSON.GeoJSON {
  // Already GeoJSON (e.g. ONS data)
  if (isRawFeatureCollection(data)) {
    return data as GeoJSON.GeoJSON;
  }

  // Esri JSON (e.g. TIGERweb data)
  if (isArcGISFeatureResponse(data)) {
    // @types/terraformer__arcgis only models ArcGIS.Geometry input, but ArcGIS feature query responses are also supported at runtime.
    return arcgisToGeoJSON(data as never) as unknown as GeoJSON.GeoJSON;
  }
  throw new Error('[ArcGIS] Unknown ArcGIS response format');
}

export async function fetchGeoJSONFromArcGIS(
  request: ArcGISQueryRequest,
  options?: ArcGISFetchOptions,
): Promise<GeoJSON.FeatureCollection> {
  const featureType = options?.featureType ?? 'features';

  const arcgisJson = await fetchJsonWithRetry(
    request.url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: request.params.toString(),
    },
    { label: 'ArcGIS' },
  );

  if (isArcGISErrorResponse(arcgisJson)) {
    const errorMessage = arcgisJson.error?.message ?? 'Unknown ArcGIS error';
    throw new Error(
      `[ArcGIS] query failed for ${request.url}: ${errorMessage}`,
    );
  }

  const geoJson: GeoJSON.GeoJSON = normalizeArcGISResponse(arcgisJson);
  if (!isFeatureCollection(geoJson)) {
    throw new Error(`[ArcGIS] Expected FeatureCollection, got ${geoJson.type}`);
  }

  console.log('[ArcGIS] Query completed.', {
    featureType,
    featureCount: geoJson.features.length,
    url: request.url,
  });
  return geoJson;
}

export async function fetchGeoJSONFromWFS(
  request: WFSQueryRequest,
  options?: WFSFetchOptions,
): Promise<GeoJSON.FeatureCollection> {
  const featureType = options?.featureType ?? 'features';
  const requestUrl = new URL(request.url);
  requestUrl.search = request.params.toString();

  const response = await fetchJsonWithRetry(requestUrl, undefined, {
    label: 'WFS',
  });
  const geoJson = response as GeoJSON.GeoJSON;

  if (!isFeatureCollection(geoJson)) {
    const responseType =
      isObject(response) && 'type' in response
        ? String((response as { type?: unknown }).type)
        : typeof response;
    throw new Error(`[WFS] Expected FeatureCollection, got ${responseType}`);
  }

  console.log('[WFS] Query completed.', {
    featureType,
    featureCount: geoJson.features.length,
    url: request.url,
  });
  return geoJson;
}

// --- Census Population Queries --- //

export async function fetchCountyPopulations(
  states: Set<string>,
): Promise<Map<string, string>> {
  const populationMap = new Map<string, string>();
  for (const state of states) {
    const statePopMap = await fetchCountyPopulationsByState(state);
    statePopMap.forEach((v, k) => populationMap.set(k, v));
  }
  return populationMap;
}

async function fetchCountyPopulationsByState(
  state: string,
): Promise<Map<string, string>> {
  // Use 2022 ACS data as prior to that date, there were no county-equivalent population data available for the state
  const url = new URL(ACS_API_URL);

  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'county:*',
    in: `state:${state}`,
  }).toString();

  const rows = parseACSRows(
    await fetchJsonWithRetry(url, undefined, { label: 'ACS' }),
    url.toString(),
  );

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
  state: string,
): Promise<Map<string, string>> {
  const url = new URL(ACS_API_URL);
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'county subdivision:*',
    in: `state:${state}`,
  }).toString();

  const rows = parseACSRows(
    await fetchJsonWithRetry(url, undefined, { label: 'ACS' }),
    url.toString(),
  );

  const [, ...data] = rows;
  const map = new Map<string, string>();

  for (const [population, stateFP, countyFP, cousub] of data) {
    const geoid = `${stateFP}${countyFP}${cousub}`;
    map.set(geoid, population);
  }

  return map;
}

export async function fetchPlacePopulations(
  state: string,
): Promise<Map<string, string>> {
  const url = new URL(ACS_API_URL);
  url.search = new URLSearchParams({
    get: 'B01003_001E',
    for: 'place:*',
    in: `state:${state}`,
  }).toString();

  const rows = parseACSRows(
    await fetchJsonWithRetry(url, undefined, { label: 'ACS' }),
    url.toString(),
  );

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
    for: 'zip code tabulation area:*',
  }).toString();

  const rows = parseACSRows(
    await fetchJsonWithRetry(url, undefined, { label: 'ACS' }),
    url.toString(),
  );

  const [, ...data] = rows;
  const map = new Map<string, string>();

  for (const [population, zcta] of data) {
    map.set(zcta, population);
  }

  return map;
}

// --- Census Data Helpers --- //

export function extractStateCodesFromGeoIDs(
  features: GeoJSON.Feature[],
): Set<string> {
  const states = new Set<string>();
  for (const feature of features) {
    const geoid = feature.properties!.GEOID!;
    if (typeof geoid === 'string' && geoid.length >= 2) {
      states.add(geoid.slice(0, 2));
    }
  }
  return states;
}

// --- Overpass API --- //

export function buildOverpassQuery(
  bbox: BoundaryBox,
  adminLevels: number[],
  countryCode?: string,
): string {
  const normalizedAdminLevels = Array.from(new Set(adminLevels)).sort(
    (a, b) => a - b,
  );
  const adminLevelRegex = `^(${normalizedAdminLevels.join('|')})$`;
  const areaSelector = countryCode
    ? `area["ISO3166-1"="${countryCode}"]["boundary"="administrative"]["admin_level"="2"]->.searchCountry;`
    : '';
  const relationSelector = countryCode
    ? `relation["boundary"="administrative"]["admin_level"~"${adminLevelRegex}"](area.searchCountry)(${bbox.south},${bbox.west},${bbox.north},${bbox.east});`
    : `relation["boundary"="administrative"]["admin_level"~"${adminLevelRegex}"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});`;

  return `
        [out:json][timeout:60];
        ${areaSelector}
        (
          ${relationSelector}
        );
        out geom;
      `;
}

export async function fetchOverpassData(
  query: string,
): Promise<OverpassApiResponse> {
  console.log('Querying Overpass API...');
  const response = await fetchJsonWithRetry(
    OVERPASS_API_URL,
    {
      method: 'POST',
      body: query,
    },
    { label: 'Overpass' },
  );

  if (!isOverpassApiResponse(response)) {
    throw new Error('[Overpass] Unexpected response shape');
  }

  return response;
}
export const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// --- GB ONS Queries --- //
export function buildONSArcGISQuery(
  baseServiceUrl: string,
  layerId: number,
  queryBBox: BoundaryBox,
): ArcGISQueryRequest {
  return {
    url: `${baseServiceUrl}/${layerId}/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: bboxToGeometryString(queryBBox),
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      inSR: '4326',
      outSR: '4326',
      outFields: '*',
      returnGeometry: 'true',
      f: 'geojson',
    }),
  };
}

export function buildCAStatCanArcGISQuery(
  queryBBox: BoundaryBox,
  layerId: number,
  outFields: string = '*',
): ArcGISQueryRequest {
  return {
    url: `${CA_STATCAN_BASE_URL}${layerId}/query`,
    params: new URLSearchParams({
      where: '1=1',
      geometry: bboxToGeometryString(queryBBox),
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      inSR: '4326',
      outSR: '4326',
      outFields: outFields,
      returnGeometry: 'true',
      f: 'geojson',
    }),
  };
}

export function getDistrictONSQuery(
  queryBBox: BoundaryBox,
): ArcGISQueryRequest {
  return buildONSArcGISQuery(
    `${ONS_API_BASE_URL}/LAD_MAY_2025_UK_BFC_V2/FeatureServer`,
    0,
    queryBBox,
  );
}

export function getBUAONSQuery(queryBBox: BoundaryBox): ArcGISQueryRequest {
  return buildONSArcGISQuery(
    `${ONS_API_BASE_URL}/BUA_2022_GB/FeatureServer`,
    0,
    queryBBox,
  );
}

export function getWardONSQuery(queryBBox: BoundaryBox): ArcGISQueryRequest {
  return buildONSArcGISQuery(
    `${ONS_API_BASE_URL}/WD_MAY_2025_UK_BFC_V2/FeatureServer`,
    0,
    queryBBox,
  );
}
