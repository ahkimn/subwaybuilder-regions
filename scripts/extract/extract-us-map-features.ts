import osmtogeojson from "osmtogeojson";
import { BoundaryBox, expandBBox, } from "../utils/geometry";
import { fetchGeoJSONFromArcGIS, buildCountyUrl, extractStateCodesFromGeoIDs, fetchCountyPopulations, buildZctaUrl, fetchCountySubdivisionPopulations, fetchOverpassData, fetchPlacePopulations, fetchZctaPopulations, fetchPlaceFeatures, fetchCouSubFeatures, buildNeighborhoodOverpassQuery } from "../utils/queries";
import { ExtractMapFeaturesArgs } from "../utils/cli";
import { BoundaryDataHandler, DataConfig } from "./handler-types";
import { processAndSaveBoundaries } from "./process";

const US_DATA_CONFIGS: Record<string, DataConfig> = {
  'counties': {
    displayName: "Counties",
    idProperty: 'GEOID',
    nameProperty: 'NAME',
    applicableNameProperties: ['NAME'],
  },
  'county-subdivisions': {
    displayName: "County Subdivisions",
    idProperty: 'GEOID',
    nameProperty: 'NAME',
    applicableNameProperties: ['BASENAME', 'NAME']
  },
  'zctas': {
    displayName: "ZIP Code Tabulation Areas",
    idProperty: 'GEOID',
    nameProperty: 'NAME',
    applicableNameProperties: ['BASENAME', 'NAME']
  },
  'neighborhoods': {
    displayName: "Neighborhoods",
    idProperty: 'id',
    nameProperty: 'name',
    applicableNameProperties: ['name'],
    populationProperty: 'population'
  }
}

const US_BOUNDARY_DATA_HANDLERS: Record<string, BoundaryDataHandler> = {
  'counties': {
    dataConfig: US_DATA_CONFIGS['counties'],
    extractBoundaries: async (bbox: BoundaryBox) => extractCountyBoundaries(bbox)
  },
  'county-subdivisions': {
    dataConfig: US_DATA_CONFIGS['county-subdivisions'],
    extractBoundaries: async (bbox: BoundaryBox) => extractCountySubdivisionBoundaries(bbox)
  },
  'zctas': {
    dataConfig: US_DATA_CONFIGS['zctas'],
    extractBoundaries: async (bbox: BoundaryBox) => extractZctaBoundaries(bbox)
  },
  'neighborhoods': {
    dataConfig: US_DATA_CONFIGS['neighborhoods'],
    extractBoundaries: async (bbox: BoundaryBox) => extractNeighborhoodBoundaries(bbox)
  }
}

async function extractCountyBoundaries(bbox: BoundaryBox) {
  const geoJson = await fetchGeoJSONFromArcGIS(buildCountyUrl(bbox));
  const populationMap = await fetchCountyPopulations(extractStateCodesFromGeoIDs(geoJson.features));
  return { geoJson, populationMap };
}

async function extractCountySubdivisionBoundaries(bbox: BoundaryBox) {

  // Fetch county subdivisions for states where municipalities are coextensive with county subdivisions
  const cousubFeatures = await fetchCouSubFeatures(bbox);
  const couSubStates = new Set(
    cousubFeatures.map(f => f.properties!.STATE!)
  )

  const populationMap = new Map<string, string>();

  for (const state of couSubStates) {
    const populations = await fetchCountySubdivisionPopulations(state);
    populations.forEach((population, geoId) => {
      populationMap.set(geoId, population);
    });
  }

  // Fetch places (including CDPs, cities, and consolidated cities) to fill in gaps for states where these are not equivalent to county subdivisions
  const placeFeatures = await fetchPlaceFeatures(bbox);
  const placeStates = new Set(
    placeFeatures.map(f => f.properties!.STATE!)
  )

  for (const state of placeStates) {
    const populations = await fetchPlacePopulations(state);
    populations.forEach((population, geoId) => {
      populationMap.set(geoId, population);
    });
  }

  const combinedGeoJson = {
    type: 'FeatureCollection',
    features: [
      ...cousubFeatures,
      ...placeFeatures
    ]
  }

  return { geoJson: combinedGeoJson as GeoJSON.FeatureCollection, populationMap };
}

async function extractZctaBoundaries(bbox: BoundaryBox) {
  const geoJson = await fetchGeoJSONFromArcGIS(buildZctaUrl(bbox));
  const populationMap = await fetchZctaPopulations();
  return { geoJson, populationMap };
}

async function extractNeighborhoodBoundaries(bbox: BoundaryBox) {
  const query = buildNeighborhoodOverpassQuery(bbox);
  const overpassJson = await fetchOverpassData(query);
  const geoJson = osmtogeojson(overpassJson);
  // Populations for neighborhoods should be included in the OSM data as a property (if available) so we don't need to return a separate population map
  return { geoJson };
}

export async function extractUSBoundaries(args: ExtractMapFeaturesArgs, bbox: BoundaryBox): Promise<void> {

  const handler = US_BOUNDARY_DATA_HANDLERS[args.dataType];
  if (!handler) {
    throw new Error(`Unsupported data type for US: ${args.dataType}`);
  }

  const { geoJson, populationMap } = await handler.extractBoundaries(expandBBox(bbox, 0.01));

  processAndSaveBoundaries(
    geoJson,
    populationMap,
    bbox,
    args,
    handler.dataConfig,
    'US'
  );
}