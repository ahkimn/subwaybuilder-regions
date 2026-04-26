import type { Feature, MultiPolygon, Polygon } from 'geojson';

import { loadGeoJSON } from '../../utils/files';
import { toPolygonFeatureCollection } from '../external/context';
import {
  CZ_NAME_PROPERTY,
  CZ_OBCE_FILE,
  CZ_OKRES_FILE,
  CZ_POPULATION_PROPERTY,
  CZ_SOURCE_ID_PROPERTY,
} from './constants';
import {
  loadCZChochoSelected,
  loadCZObecPopulationIndex,
  loadCZZsjDilNameIndex,
  normalizeCZMunicipalityCode,
  resolveCZPopulation,
  resolveCZRequiredSourcePath,
} from './context';
import type { CZBundleContext } from './types';

type CZSourceFeature = Feature<Polygon | MultiPolygon>;

function withCZRegionProperties(
  feature: CZSourceFeature,
  id: string,
  name: string,
  population: number,
): CZSourceFeature {
  return {
    ...feature,
    properties: {
      ...(feature.properties ?? {}),
      [CZ_SOURCE_ID_PROPERTY]: id,
      [CZ_NAME_PROPERTY]: name,
      [CZ_POPULATION_PROPERTY]: population,
    },
  };
}

function readRequiredName(
  properties: GeoJSON.GeoJsonProperties,
  fieldName: string,
  label: string,
): string {
  const name = String(properties?.[fieldName] ?? '').trim();
  if (!name) {
    throw new Error(`[CZ] Missing ${fieldName} for ${label}.`);
  }
  return name;
}

function resolveMunicipalityCodeSet(value: unknown, label: string): Set<string> {
  if (!Array.isArray(value)) {
    throw new Error(`[CZ] Missing municipality_codes for ${label}.`);
  }

  const municipalityCodes = new Set<string>();
  for (const entry of value) {
    const code = normalizeCZMunicipalityCode(entry);
    if (code) {
      municipalityCodes.add(code);
    }
  }

  if (municipalityCodes.size === 0) {
    throw new Error(`[CZ] Empty municipality_codes for ${label}.`);
  }

  return municipalityCodes;
}

export function buildCZObceSourceCollection(context: CZBundleContext) {
  const sourceCollection = toPolygonFeatureCollection(
    loadGeoJSON(
      resolveCZRequiredSourcePath(
        context.sourceRoot,
        CZ_OBCE_FILE,
        'CZ obce regions',
      ),
    ),
  );
  const features: CZSourceFeature[] = [];

  for (const feature of sourceCollection.features) {
    const properties = feature.properties ?? {};
    const obecCode = normalizeCZMunicipalityCode(properties.obec_code);
    if (!obecCode || !context.municipalityCodes.has(obecCode)) {
      continue;
    }

    features.push(
      withCZRegionProperties(
        feature,
        obecCode,
        readRequiredName(properties, 'obec_name', `obec ${obecCode}`),
        resolveCZPopulation(properties, 'population', `obec ${obecCode}`),
      ),
    );
  }

  return {
    type: 'FeatureCollection' as const,
    features,
  };
}

export function buildCZOkresSourceCollection(context: CZBundleContext) {
  const sourceCollection = toPolygonFeatureCollection(
    loadGeoJSON(
      resolveCZRequiredSourcePath(
        context.sourceRoot,
        CZ_OKRES_FILE,
        'CZ okres regions',
      ),
    ),
  );
  const obecIndex = loadCZObecPopulationIndex(context.sourceRoot);
  const features: CZSourceFeature[] = [];

  for (const feature of sourceCollection.features) {
    const properties = feature.properties ?? {};
    const okresCode = String(properties.okres_code ?? '').trim();
    if (!okresCode) {
      throw new Error('[CZ] okres.geojson feature is missing okres_code.');
    }

    const okresMunicipalityCodes = resolveMunicipalityCodeSet(
      properties.municipality_codes,
      `okres ${okresCode}`,
    );
    let population = 0;
    let hasIncludedMunicipality = false;

    for (const municipalityCode of okresMunicipalityCodes) {
      if (!context.municipalityCodes.has(municipalityCode)) {
        continue;
      }
      hasIncludedMunicipality = true;
      population += obecIndex.get(municipalityCode)?.population ?? 0;
    }

    if (!hasIncludedMunicipality) {
      continue;
    }

    features.push(
      withCZRegionProperties(
        feature,
        okresCode,
        readRequiredName(properties, 'okres_name', `okres ${okresCode}`),
        population,
      ),
    );
  }

  return {
    type: 'FeatureCollection' as const,
    features,
  };
}

export function buildCZZsjSourceCollection(context: CZBundleContext) {
  const chochoSelected = loadCZChochoSelected(context);
  const namesByChochoKey = loadCZZsjDilNameIndex(context.sourceRoot);
  const features: CZSourceFeature[] = [];

  for (const feature of chochoSelected.features) {
    const properties = feature.properties ?? {};
    const municipalityCode = normalizeCZMunicipalityCode(
      properties.municipality_code,
    );
    if (!context.municipalityCodes.has(municipalityCode)) {
      continue;
    }

    const chochoKey = String(properties.chocho_key ?? '').trim();
    if (!chochoKey) {
      throw new Error('[CZ] chocho_selected feature is missing chocho_key.');
    }
    const nameRow = namesByChochoKey.get(chochoKey);
    if (!nameRow) {
      throw new Error(
        `[CZ] Missing ZSJ-díl label mapping for chocho_key ${chochoKey}.`,
      );
    }

    features.push(
      withCZRegionProperties(
        feature,
        chochoKey,
        nameRow.name,
        resolveCZPopulation(properties, 'pop_total', `chocho ${chochoKey}`),
      ),
    );
  }

  return {
    type: 'FeatureCollection' as const,
    features,
  };
}
