import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { toNonEmptyString, toPositiveInteger } from '../utils/cli';
import type { BoundaryBox } from '../utils/geometry';
import { expandBBox } from '../utils/geometry';
import { renderFeaturePreview } from '../utils/preview';
import {
  buildAUASGSBoundaryQuery,
  buildAUCensusPopulationQuery,
  fetchArcGISAttributes,
  fetchGeoJSONFromArcGIS,
} from '../utils/queries';
import { createDataConfigFromCatalog } from './data-config';
import type { DataConfig } from './handler-types';
import { processAndSaveBoundaries } from './process';

const AU_BOUNDARY_LAYER_ID = 0;
const AU_POPULATION_FIELD = 'Tot_P_P';
const PREVIEW_OUT_FIELDS = '*';

type AUASGSBoundaryType = 'SA3' | 'SA2' | 'CED' | 'SED' | 'LGA' | 'POA';

export const AU_DATA_CONFIGS: Record<string, DataConfig> = {
  sa3s: createDataConfigFromCatalog('sa3s', {
    idProperty: 'sa3_code_2021',
    nameProperty: 'sa3_name_2021',
    applicableNameProperties: ['sa3_name_2021'],
  }),
  sa2s: createDataConfigFromCatalog('sa2s', {
    idProperty: 'sa2_code_2021',
    nameProperty: 'sa2_name_2021',
    applicableNameProperties: ['sa2_name_2021'],
  }),
  ceds: createDataConfigFromCatalog('ceds', {
    idProperty: 'ced_code_2021',
    nameProperty: 'ced_name_2021',
    applicableNameProperties: ['ced_name_2021'],
  }),
  seds: createDataConfigFromCatalog('seds', {
    idProperty: 'sed_code_2021',
    nameProperty: 'sed_name_2021',
    applicableNameProperties: ['sed_name_2021'],
  }),
  lgas: createDataConfigFromCatalog('lgas', {
    idProperty: 'lga_code_2021',
    nameProperty: 'lga_name_2021',
    applicableNameProperties: ['lga_name_2021'],
  }),
  poas: createDataConfigFromCatalog('poas', {
    idProperty: 'poa_code_2021',
    nameProperty: 'poa_name_2021',
    applicableNameProperties: ['poa_name_2021'],
  }),
};

type AUDataHandler = {
  dataConfig: DataConfig;
  boundaryType: AUASGSBoundaryType;
  boundaryOutFields: string;
  populationLayerId: number;
  populationCodeField: string;
  populationCodePrefixToStrip?: string;
};

const AU_BOUNDARY_DATA_HANDLERS: Record<string, AUDataHandler> = {
  sa3s: {
    dataConfig: AU_DATA_CONFIGS['sa3s'],
    boundaryType: 'SA3',
    boundaryOutFields:
      'sa3_code_2021,sa3_name_2021,state_code_2021,state_name_2021,area_albers_sqkm',
    populationLayerId: 3,
    populationCodeField: 'SA3_CODE_2021',
  },
  sa2s: {
    dataConfig: AU_DATA_CONFIGS['sa2s'],
    boundaryType: 'SA2',
    boundaryOutFields:
      'sa2_code_2021,sa2_name_2021,state_code_2021,state_name_2021,area_albers_sqkm',
    populationLayerId: 4,
    populationCodeField: 'SA2_CODE_2021',
  },
  ceds: {
    dataConfig: AU_DATA_CONFIGS['ceds'],
    boundaryType: 'CED',
    boundaryOutFields:
      'ced_code_2021,ced_name_2021,state_code_2021,state_name_2021,area_albers_sqkm',
    populationLayerId: 6,
    populationCodeField: 'CED_CODE_2021',
    populationCodePrefixToStrip: 'CED',
  },
  seds: {
    dataConfig: AU_DATA_CONFIGS['seds'],
    boundaryType: 'SED',
    boundaryOutFields:
      'sed_code_2021,sed_name_2021,state_code_2021,state_name_2021,area_albers_sqkm',
    populationLayerId: 7,
    populationCodeField: 'SED_CODE_2021',
    populationCodePrefixToStrip: 'SED',
  },
  lgas: {
    dataConfig: AU_DATA_CONFIGS['lgas'],
    boundaryType: 'LGA',
    boundaryOutFields:
      'lga_code_2021,lga_name_2021,state_code_2021,state_name_2021,area_albers_sqkm',
    populationLayerId: 8,
    populationCodeField: 'LGA_CODE_2021',
    populationCodePrefixToStrip: 'LGA',
  },
  poas: {
    dataConfig: AU_DATA_CONFIGS['poas'],
    boundaryType: 'POA',
    boundaryOutFields: 'poa_code_2021,poa_name_2021,area_albers_sqkm',
    populationLayerId: 9,
    populationCodeField: 'POA_CODE_2021',
    populationCodePrefixToStrip: 'POA',
  },
};

function normalizePopulationCode(
  code: string,
  prefixToStrip?: string,
): string | undefined {
  if (!prefixToStrip) {
    return code;
  }

  return code.startsWith(prefixToStrip)
    ? toNonEmptyString(code.slice(prefixToStrip.length))
    : code;
}

async function extractAUBoundariesByType(
  bbox: BoundaryBox,
  handler: AUDataHandler,
  outFields: string,
): Promise<GeoJSON.FeatureCollection> {
  const query = buildAUASGSBoundaryQuery(
    bbox,
    handler.boundaryType,
    AU_BOUNDARY_LAYER_ID,
    outFields,
  );
  return fetchGeoJSONFromArcGIS(query, {
    featureType: handler.dataConfig.displayName.toLowerCase(),
  });
}

async function fetchAUPopulationMap(
  bbox: BoundaryBox,
  handler: AUDataHandler,
): Promise<Map<string, string>> {
  const query = buildAUCensusPopulationQuery(
    bbox,
    handler.populationLayerId,
    `${handler.populationCodeField},${AU_POPULATION_FIELD}`,
  );
  const attributesList = await fetchArcGISAttributes(query, {
    featureType: `${handler.dataConfig.displayName.toLowerCase()} populations`,
  });

  const populationMap = new Map<string, string>();
  for (const attributes of attributesList) {
    const rawCode = toNonEmptyString(attributes[handler.populationCodeField]);
    const population = toPositiveInteger(attributes[AU_POPULATION_FIELD]);
    if (!rawCode || population === undefined) {
      continue;
    }

    const normalizedCode = normalizePopulationCode(
      rawCode,
      handler.populationCodePrefixToStrip,
    );
    if (!normalizedCode) {
      continue;
    }

    populationMap.set(normalizedCode, String(population));
  }

  console.log('Built AU population map.', {
    datasetId: handler.dataConfig.datasetId,
    featureCount: populationMap.size,
  });
  return populationMap;
}

export async function extractAUBoundaries(
  args: ExtractMapFeaturesArgs,
  bbox: BoundaryBox,
): Promise<void> {
  const handler = AU_BOUNDARY_DATA_HANDLERS[args.dataType];
  if (!handler) {
    throw new Error(`Unsupported data type for AU: ${args.dataType}`);
  }

  const queryBBox = expandBBox(bbox, 0.01);
  const geoJson = await extractAUBoundariesByType(
    queryBBox,
    handler,
    args.preview ? PREVIEW_OUT_FIELDS : handler.boundaryOutFields,
  );

  if (args.preview) {
    renderFeaturePreview(geoJson.features, args.previewCount!);
    return;
  }

  const populationMap = await fetchAUPopulationMap(queryBBox, handler);

  processAndSaveBoundaries(
    geoJson,
    populationMap,
    bbox,
    args,
    handler.dataConfig,
    'AU',
  );
}
