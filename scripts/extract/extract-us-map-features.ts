import osmtogeojson from 'osmtogeojson';

import type { ExtractMapFeaturesArgs } from '../utils/cli';
import type { BoundaryBox } from '../utils/geometry';
import { expandBBox } from '../utils/geometry';
import { renderFeaturePreview } from '../utils/preview';
import {
  buildCountyUrl,
  buildOverpassQuery,
  buildZctaUrl,
  extractStateCodesFromGeoIDs,
  fetchCountyPopulations,
  fetchCountySubdivisionPopulations,
  fetchCouSubFeatures,
  fetchGeoJSONFromArcGIS,
  fetchOverpassData,
  fetchPlaceFeatures,
  fetchPlacePopulations,
  fetchZctaPopulations,
} from '../utils/queries';
import { createDataConfigFromCatalog } from './data-config';
import type { BoundaryDataHandler, DataConfig } from './handler-types';
import { processAndSaveBoundaries } from './process';

const COUNTY_LSADC_UNIT_TYPE_MAP: Record<string, string> = {
  '00': 'County Equivalent',
  '03': 'City and Borough',
  '04': 'Borough',
  '05': 'Census Area',
  '06': 'County',
  '07': 'District',
  '10': 'Island',
  '12': 'Municipality',
  '13': 'Municipio',
  '15': 'Parish',
  '25': 'City',
  PL: 'Planning Region',
};

const COUNTY_SUBDIVISION_LSADC_UNIT_TYPE_MAP: Record<string, string> = {
  '00': 'Subdivision',
  '20': 'Barrio',
  '21': 'Borough',
  '22': 'Census County Division',
  '23': 'Census Subarea',
  '24': 'Subdistrict',
  '25': 'City',
  '26': 'County',
  '27': 'District',
  '28': 'District',
  '29': 'Precinct',
  '30': 'Precinct',
  '31': 'Gore',
  '32': 'Grant',
  '36': 'Location',
  '37': 'Municipality',
  '39': 'Plantation',
  '41': 'Barrio-Pueblo',
  '42': 'Purchase',
  '43': 'Town',
  '44': 'Township',
  '45': 'Township',
  '46': 'Unorganized Territory',
  '47': 'Village',
  '49': 'Charter Township',
  '53': 'City and Borough',
  '55': 'Comunidad',
  '57': 'Census Designated Place',
  '62': 'Zona Urbana',
  '86': 'Reservation',
  CG: 'Consolidated Government',
  CN: 'Corporation',
  MG: 'Metropolitan Government',
  MT: 'Metro Government',
  UC: 'Urban County',
  UG: 'Unified Government',
};

const US_DATA_CONFIGS: Record<string, DataConfig> = {
  counties: createDataConfigFromCatalog('counties', {
    idProperty: 'GEOID',
    nameProperty: 'NAME',
    applicableNameProperties: ['NAME'],
    unitTypeProperty: 'LSADC',
    unitTypeCodeMap: COUNTY_LSADC_UNIT_TYPE_MAP,
  }),
  'county-subdivisions': createDataConfigFromCatalog('county-subdivisions', {
    idProperty: 'GEOID',
    nameProperty: 'NAME',
    applicableNameProperties: ['BASENAME', 'NAME'],
    unitTypeProperty: 'LSADC',
    unitTypeCodeMap: COUNTY_SUBDIVISION_LSADC_UNIT_TYPE_MAP,
  }),
  zctas: createDataConfigFromCatalog('zctas', {
    idProperty: 'GEOID',
    nameProperty: 'NAME',
    applicableNameProperties: ['BASENAME', 'NAME'],
  }),
  neighborhoods: {
    datasetId: 'neighborhoods',
    displayName: 'Neighborhoods',
    unitSingular: 'Neighborhood',
    unitPlural: 'Neighborhoods',
    source: 'OSM',
    idProperty: 'id',
    nameProperty: 'name',
    applicableNameProperties: ['name'],
    populationProperty: 'population',
  },
};

const US_BOUNDARY_DATA_HANDLERS: Record<string, BoundaryDataHandler> = {
  counties: {
    dataConfig: US_DATA_CONFIGS['counties'],
    extractBoundaries: async (bbox: BoundaryBox) =>
      extractCountyBoundaries(bbox),
  },
  'county-subdivisions': {
    dataConfig: US_DATA_CONFIGS['county-subdivisions'],
    extractBoundaries: async (bbox: BoundaryBox) =>
      extractCountySubdivisionBoundaries(bbox),
  },
  zctas: {
    dataConfig: US_DATA_CONFIGS['zctas'],
    extractBoundaries: async (bbox: BoundaryBox) => extractZctaBoundaries(bbox),
  },
  neighborhoods: {
    dataConfig: US_DATA_CONFIGS['neighborhoods'],
    extractBoundaries: async (bbox: BoundaryBox) =>
      extractNeighborhoodBoundaries(bbox),
  },
};

// Neighborhood data is queried from OpenStreetMap Overpass API based on admin levels.
const US_NEIGHBORHOOD_ADMIN_LEVELS = [10];

async function extractCountyBoundaries(bbox: BoundaryBox) {
  const geoJson = await fetchGeoJSONFromArcGIS(buildCountyUrl(bbox), {
    featureType: 'counties',
  });
  const populationMap = await fetchCountyPopulations(
    extractStateCodesFromGeoIDs(geoJson.features),
  );
  return { geoJson, populationMap };
}

async function extractCountySubdivisionBoundaries(bbox: BoundaryBox) {
  // Fetch county subdivisions for states where municipalities are coextensive with county subdivisions
  const cousubFeatures = await fetchCouSubFeatures(bbox);
  const couSubStates = new Set(cousubFeatures.map((f) => f.properties!.STATE!));

  const populationMap = new Map<string, string>();

  for (const state of couSubStates) {
    const populations = await fetchCountySubdivisionPopulations(state);
    populations.forEach((population, geoId) => {
      populationMap.set(geoId, population);
    });
  }

  // Fetch places (including CDPs, cities, and consolidated cities) to fill in gaps for states where these are not equivalent to county subdivisions
  const placeFeatures = await fetchPlaceFeatures(bbox);
  const placeStates = new Set(placeFeatures.map((f) => f.properties!.STATE!));

  for (const state of placeStates) {
    const populations = await fetchPlacePopulations(state);
    populations.forEach((population, geoId) => {
      populationMap.set(geoId, population);
    });
  }

  const combinedGeoJson = {
    type: 'FeatureCollection',
    features: [...cousubFeatures, ...placeFeatures],
  };

  return {
    geoJson: combinedGeoJson as GeoJSON.FeatureCollection,
    populationMap,
  };
}

async function extractZctaBoundaries(bbox: BoundaryBox) {
  const geoJson = await fetchGeoJSONFromArcGIS(buildZctaUrl(bbox), {
    featureType: 'zctas',
  });
  const populationMap = await fetchZctaPopulations();
  return { geoJson, populationMap };
}

async function extractNeighborhoodBoundaries(bbox: BoundaryBox) {
  const query = buildOverpassQuery(bbox, US_NEIGHBORHOOD_ADMIN_LEVELS, 'US');
  const overpassJson = await fetchOverpassData(query);
  const geoJson = osmtogeojson(overpassJson);
  // Populations for neighborhoods should be included in the OSM data as a property (if available) so we don't need to return a separate population map
  return { geoJson };
}

export async function extractUSBoundaries(
  args: ExtractMapFeaturesArgs,
  bbox: BoundaryBox,
): Promise<void> {
  const handler = US_BOUNDARY_DATA_HANDLERS[args.dataType];
  if (!handler) {
    throw new Error(`Unsupported data type for US: ${args.dataType}`);
  }

  const { geoJson, populationMap } = await handler.extractBoundaries(
    expandBBox(bbox, 0.01),
  );
  if (args.preview) {
    renderFeaturePreview(geoJson.features, args.previewCount!);
    return;
  }

  processAndSaveBoundaries(
    geoJson,
    populationMap,
    bbox,
    args,
    handler.dataConfig,
    'US',
  );
}
