import path from 'path';

import { SOURCE_DATA_DIR } from '../../mods/regions/constants';
import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { loadGeoJSON, loadGeoJSONFromNDJSON } from '../utils/files';
import type { BoundaryBox } from '../utils/geometry';
import { expandBBox } from '../utils/geometry';
import { renderFeaturePreview } from '../utils/preview';
import {
  buildNomisPopulationQuery,
  fetchGeoJSONFromArcGIS,
  fetchNomisPopulationIndex,
  getBUAONSQuery,
  getDistrictONSQuery,
  getWardONSQuery,
  getWPCONSQuery,
} from '../utils/queries';
import { createDataConfigFromCatalog } from './data-config';
import type { BoundaryDataHandler, DataConfig } from './handler-types';
import { processAndSaveBoundaries } from './process';

/* --- Local Authority Districts (LAD) ---
  Source: https://geoportal.statistics.gov.uk/datasets/ons::local-authority-districts-may-2025-boundaries-uk-bfc-v2/about
  Resolution: Full resolution (clipped to coastline)
*/
const GB_DISTRICT_BOUNDARIES = 'gb_district_boundaries.geojson.gz';

const DISTRICT_CODE_PROPERTY = 'LAD25CD';
const DISTRICT_NAME_PROPERTY = 'LAD25NM';
const DISTRICT_WELSH_NAME_PROPERTY = 'LAD25NMW';

/* --- Built-Up Areas (BUA) ---
   Source: https://geoportal.statistics.gov.uk/datasets/ons::built-up-areas-december-2022-boundaries-gb-bgg/about
   Note: Missing Northern Ireland BUAs
   Resolution: 25m grid squares
*/
const GB_BUA_BOUNDARIES = 'gb_bua_boundaries.geojson.gz';

const BUA_CODE_PROPERTY = 'BUA22CD';
const BUA_NAME_PROPERTY = 'BUA22NM';
const BUA_WELSH_NAME_PROPERTY = 'BUA22NMW';
const BUA_GAELIC_NAME_PROPERTY = 'BUA22NMG';

/* --- Westminster Parliamentary Constituencies (WPC) ---
  Source: https://geoportal.statistics.gov.uk/datasets/ons::westminster-parliamentary-constituencies-july-2024-boundaries-uk-bgc/about
  Resolution: Generalized clipped boundaries
*/
const GB_WPC_BOUNDARIES = 'gb_wpc_boundaries.geojson.gz';
const WPC_CODE_PROPERTY = 'PCON24CD';
const WPC_NAME_PROPERTY = 'PCON24NM';
const WPC_WELSH_NAME_PROPERTY = 'PCON24NMW';

/* --- Wards (Electoral Divisions) ---
  Source: https://geoportal.statistics.gov.uk/datasets/ons::wards-may-2025-boundaries-uk-bfc-v2-1/about
  Resolution: Full resolution (clipped to coastline)
*/
const GB_WARD_BOUNDARIES = 'gb_ward_boundaries.ndjson.gz';

const WARD_CODE_PROPERTY = 'WD25CD';
const WARD_NAME_PROPERTY = 'WD25NM';
const WARD_WELSH_NAME_PROPERTY = 'WD25NMW';

const GB_DATA_CONFIGS: Record<string, DataConfig> = {
  districts: createDataConfigFromCatalog('districts', {
    idProperty: DISTRICT_CODE_PROPERTY,
    nameProperty: DISTRICT_NAME_PROPERTY,
    applicableNameProperties: [
      DISTRICT_WELSH_NAME_PROPERTY,
      DISTRICT_NAME_PROPERTY,
    ],
    populationProperty: 'Population',
  }),
  bua: createDataConfigFromCatalog('bua', {
    idProperty: BUA_CODE_PROPERTY,
    nameProperty: BUA_NAME_PROPERTY,
    applicableNameProperties: [
      BUA_WELSH_NAME_PROPERTY,
      BUA_GAELIC_NAME_PROPERTY,
      BUA_NAME_PROPERTY,
    ],
    populationProperty: 'Population',
  }),
  wpcs: createDataConfigFromCatalog('wpcs', {
    idProperty: WPC_CODE_PROPERTY,
    nameProperty: WPC_NAME_PROPERTY,
    applicableNameProperties: [WPC_WELSH_NAME_PROPERTY, WPC_NAME_PROPERTY],
  }),
  wards: createDataConfigFromCatalog('wards', {
    idProperty: WARD_CODE_PROPERTY,
    nameProperty: WARD_NAME_PROPERTY,
    applicableNameProperties: [WARD_WELSH_NAME_PROPERTY, WARD_NAME_PROPERTY],
    populationProperty: 'Population',
  }),
};

type GBNomisPopulationConfig = {
  datasetId: 'NM_2002_1' | 'NM_2014_1';
  geographyTypeCode: number;
};

type GBBoundaryDataHandler = BoundaryDataHandler & {
  nomisPopulation: GBNomisPopulationConfig;
};

const GB_BOUNDARY_DATA_HANDLERS: Record<string, GBBoundaryDataHandler> = {
  districts: {
    dataConfig: GB_DATA_CONFIGS['districts'],
    nomisPopulation: {
      datasetId: 'NM_2002_1',
      geographyTypeCode: 424,
    },
    extractBoundaries: async (bbox: BoundaryBox, useLocalData?: boolean) =>
      extractDistrictBoundaries(bbox, useLocalData),
  },
  bua: {
    dataConfig: GB_DATA_CONFIGS['bua'],
    nomisPopulation: {
      datasetId: 'NM_2014_1',
      geographyTypeCode: 170,
    },
    extractBoundaries: async (bbox: BoundaryBox, useLocalData?: boolean) =>
      extractBUABoundaries(bbox, useLocalData),
  },
  wpcs: {
    dataConfig: GB_DATA_CONFIGS['wpcs'],
    nomisPopulation: {
      datasetId: 'NM_2014_1',
      geographyTypeCode: 172,
    },
    extractBoundaries: async (bbox: BoundaryBox, useLocalData?: boolean) =>
      extractWPCBoundaries(bbox, useLocalData),
  },
  wards: {
    dataConfig: GB_DATA_CONFIGS['wards'],
    nomisPopulation: {
      datasetId: 'NM_2014_1',
      geographyTypeCode: 182,
    },
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
    : await fetchGeoJSONFromArcGIS(getDistrictONSQuery(bbox), {
        featureType: 'districts',
      });
  return { geoJson: boundaries };
}

async function extractBUABoundaries(
  bbox: BoundaryBox,
  useLocal: boolean = false,
) {
  const boundaries: GeoJSON.FeatureCollection = useLocal
    ? loadGeoJSON(path.resolve(SOURCE_DATA_DIR, GB_BUA_BOUNDARIES))
    : await fetchGeoJSONFromArcGIS(getBUAONSQuery(bbox), {
        featureType: 'built-up areas',
      });
  return { geoJson: boundaries };
}

async function extractWardBoundaries(
  bbox: BoundaryBox,
  useLocal: boolean = false,
) {
  const boundaries: GeoJSON.FeatureCollection = useLocal
    ? await loadGeoJSONFromNDJSON(
        path.resolve(SOURCE_DATA_DIR, GB_WARD_BOUNDARIES),
      )
    : await fetchGeoJSONFromArcGIS(getWardONSQuery(bbox), {
        featureType: 'electoral wards',
      });
  return { geoJson: boundaries };
}

async function extractWPCBoundaries(
  bbox: BoundaryBox,
  useLocal: boolean = false,
) {
  const boundaries: GeoJSON.FeatureCollection = useLocal
    ? loadGeoJSON(path.resolve(SOURCE_DATA_DIR, GB_WPC_BOUNDARIES))
    : await fetchGeoJSONFromArcGIS(getWPCONSQuery(bbox), {
        featureType: 'westminster parliamentary constituencies',
      });

  return { geoJson: boundaries };
}

export async function extractGBBoundaries(
  args: ExtractMapFeaturesArgs,
  bbox: BoundaryBox,
): Promise<void> {
  const handler = GB_BOUNDARY_DATA_HANDLERS[args.dataType];
  if (!handler) {
    throw new Error(`Unsupported data type for GB: ${args.dataType}`);
  }
  const { geoJson } = await handler.extractBoundaries(
    expandBBox(bbox, 0.01),
    args.useLocalData,
  );
  if (args.preview) {
    renderFeaturePreview(geoJson.features, args.previewCount!);
    return;
  }
  const populationResult = await fetchNomisPopulationIndex(
    buildNomisPopulationQuery(
      handler.nomisPopulation.datasetId,
      handler.nomisPopulation.geographyTypeCode,
    ),
    {
      featureType: `${handler.dataConfig.displayName.toLowerCase()} populations`,
    },
  );

  console.log('[GB] Using NOMIS population date for dataset.', {
    datasetId: handler.dataConfig.datasetId,
    date: populationResult.resolvedDateName ?? populationResult.resolvedDate,
  });

  processAndSaveBoundaries(
    geoJson,
    populationResult.populationMap,
    bbox,
    args,
    handler.dataConfig,
    'GB',
  );
}
