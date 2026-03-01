import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { toNonEmptyString, toPositiveInteger } from '../utils/cli';
import type { BoundaryBox } from '../utils/geometry';
import { expandBBox } from '../utils/geometry';
import { renderFeaturePreview } from '../utils/preview';
import { buildIgnAdminWfsQuery, fetchGeoJSONFromWFS } from '../utils/queries';
import { createDataConfigFromCatalog } from './data-config';
import type { DataConfig } from './handler-types';
import { processAndSaveBoundaries } from './process';

type IGNAdminWfsTypeName =
  | 'ADMINEXPRESS-COG-CARTO.LATEST:departement'
  | 'ADMINEXPRESS-COG-CARTO.LATEST:arrondissement'
  | 'ADMINEXPRESS-COG-CARTO.LATEST:canton'
  | 'ADMINEXPRESS-COG-CARTO.LATEST:epci'
  | 'ADMINEXPRESS-COG-CARTO.LATEST:commune';

export const FR_DATA_CONFIGS: Record<string, DataConfig> = {
  departments: createDataConfigFromCatalog('departments', {
    idProperty: 'code_insee',
    nameProperty: 'nom_officiel',
    applicableNameProperties: ['nom_officiel', 'nom_officiel_en_majuscules'],
  }),
  arrondissements: createDataConfigFromCatalog('arrondissements', {
    idProperty: 'code_insee',
    nameProperty: 'nom_officiel',
    applicableNameProperties: ['nom_officiel', 'nom_officiel_en_majuscules'],
  }),
  cantons: createDataConfigFromCatalog('cantons', {
    idProperty: 'code_insee',
    nameProperty: 'nom_officiel',
    applicableNameProperties: ['nom_officiel', 'nom_officiel_en_majuscules'],
  }),
  epci: createDataConfigFromCatalog('epci', {
    idProperty: 'code_siren',
    nameProperty: 'nom_officiel',
    applicableNameProperties: ['nom_officiel', 'nom_officiel_en_majuscules'],
  }),
  communes: createDataConfigFromCatalog('communes', {
    idProperty: 'code_insee',
    nameProperty: 'nom_officiel',
    applicableNameProperties: ['nom_officiel', 'nom_officiel_en_majuscules'],
    populationProperty: 'population',
  }),
};

type FRBoundaryDataHandler = {
  dataConfig: DataConfig;
  typeName: IGNAdminWfsTypeName;
};

const FR_BOUNDARY_DATA_HANDLERS: Record<string, FRBoundaryDataHandler> = {
  departments: {
    dataConfig: FR_DATA_CONFIGS['departments'],
    typeName: 'ADMINEXPRESS-COG-CARTO.LATEST:departement',
  },
  arrondissements: {
    dataConfig: FR_DATA_CONFIGS['arrondissements'],
    typeName: 'ADMINEXPRESS-COG-CARTO.LATEST:arrondissement',
  },
  cantons: {
    dataConfig: FR_DATA_CONFIGS['cantons'],
    typeName: 'ADMINEXPRESS-COG-CARTO.LATEST:canton',
  },
  epci: {
    dataConfig: FR_DATA_CONFIGS['epci'],
    typeName: 'ADMINEXPRESS-COG-CARTO.LATEST:epci',
  },
  communes: {
    dataConfig: FR_DATA_CONFIGS['communes'],
    typeName: 'ADMINEXPRESS-COG-CARTO.LATEST:commune',
  },
};

type FRDatasetId = keyof typeof FR_DATA_CONFIGS;

const COMMUNE_WFS_TYPE_NAME = 'ADMINEXPRESS-COG-CARTO.LATEST:commune';

type CommuneProperties = {
  population?: unknown;
  code_insee_du_departement?: unknown;
  code_insee_de_l_arrondissement?: unknown;
  code_insee_du_canton?: unknown;
  codes_siren_des_epci?: unknown;
};

function incrementPopulation(
  populationMap: Map<string, string>,
  key: string,
  population: number,
): void {
  const currentPopulation = Number(populationMap.get(key) ?? 0);
  populationMap.set(key, String(currentPopulation + population));
}

// codes_siren_des_epci can contain multiple EPCI codes delimited by '/'; this helper parses the raw string into an array using that delimiter and trimming whitespace
function parseEPCICodes(value: unknown): string[] {
  const rawCodes = toNonEmptyString(value); // Avoid NPE if the property is missing
  if (!rawCodes) {
    return [];
  }
  return rawCodes
    .split('/')
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

function resolveAggregateKeys(
  datasetId: FRDatasetId,
  properties: CommuneProperties,
): string[] {
  switch (datasetId) {
    case 'departments': {
      const code = toNonEmptyString(properties.code_insee_du_departement);
      return code ? [code] : [];
    }
    case 'arrondissements': {
      const code = toNonEmptyString(properties.code_insee_de_l_arrondissement);
      return code ? [code] : [];
    }
    case 'cantons': {
      const code = toNonEmptyString(properties.code_insee_du_canton);
      return code ? [code] : [];
    }
    case 'epci':
      return parseEPCICodes(properties.codes_siren_des_epci);
    case 'communes':
    default:
      return [];
  }
}

// INSEE provides population data at the commune level, so for higher-order boundaries such as arrondissements or departments it is necessary to aggregate the population of the underlying communes.
function buildPopulationMapFromCommunes(
  datasetId: FRDatasetId,
  communesGeoJson: GeoJSON.FeatureCollection,
): Map<string, string> {
  const populationMap = new Map<string, string>();

  communesGeoJson.features.forEach((feature) => {
    const properties = (feature.properties ?? {}) as CommuneProperties;
    const population = toPositiveInteger(properties.population);
    if (population === undefined) {
      return;
    }
    const aggregateKeys = resolveAggregateKeys(datasetId, properties);
    aggregateKeys.forEach((key) => {
      incrementPopulation(populationMap, key, population);
    });
  });

  return populationMap;
}

async function extractFRBoundariesByTypeName(
  bbox: BoundaryBox,
  typeName: IGNAdminWfsTypeName,
  featureType: string,
): Promise<{ geoJson: GeoJSON.FeatureCollection }> {
  const query = buildIgnAdminWfsQuery(bbox, typeName);
  const geoJson = await fetchGeoJSONFromWFS(query, { featureType });
  return { geoJson };
}

export async function extractFRBoundaries(
  args: ExtractMapFeaturesArgs,
  bbox: BoundaryBox,
): Promise<void> {
  const handler = FR_BOUNDARY_DATA_HANDLERS[args.dataType];
  if (!handler) {
    throw new Error(`Unsupported data type for FR: ${args.dataType}`);
  }

  const queryBBox = expandBBox(bbox, 0.01);

  const { geoJson } = await extractFRBoundariesByTypeName(
    queryBBox,
    handler.typeName,
    handler.dataConfig.displayName.toLowerCase(),
  );

  if (args.preview) {
    renderFeaturePreview(geoJson.features, args.previewCount!);
    return;
  }

  let populationMap: Map<string, string> | undefined;
  // For the `communes` dataset, population is already included
  if (args.dataType !== 'communes') {
    // Requerying for communes is not the most efficient way to get the population data for higher-order boundaries when multiple datasets are requested at the same time; however, we cannot assume the communes will be fetched in each request
    const { geoJson: communesGeoJson } = await extractFRBoundariesByTypeName(
      queryBBox,
      COMMUNE_WFS_TYPE_NAME,
      `${handler.dataConfig.displayName.toLowerCase()} population source (communes)`,
    );

    populationMap = buildPopulationMapFromCommunes(
      args.dataType as FRDatasetId,
      communesGeoJson,
    );

    console.log('Built population map from communes.', {
      targetDataset: args.dataType,
      aggregateFeatureCount: populationMap.size,
    });
  }

  processAndSaveBoundaries(
    geoJson,
    populationMap,
    bbox,
    args,
    handler.dataConfig,
    'FR',
  );
}
