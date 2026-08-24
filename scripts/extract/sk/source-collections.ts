import type { Feature, MultiPolygon, Polygon } from 'geojson';

import { loadGeoJSON } from '../../utils/files';
import { toPolygonFeatureCollection } from '../external/context';
import {
  SK_MUNICIPALITY_CODES_SEPARATOR,
  SK_NAME_PROPERTY,
  SK_OBCE_FILE,
  SK_OKRES_FILE,
  SK_POPULATION_PROPERTY,
  SK_SOURCE_ID_PROPERTY,
  SK_ZSJ_FILE,
} from './constants';
import {
  loadSKChochoSelected,
  normalizeSKMunicipalityCode,
  resolveSKPopulation,
  resolveSKRequiredSourcePath,
} from './context';
import type { SKBundleContext } from './types';

type SKSourceFeature = Feature<Polygon | MultiPolygon>;

function withSKRegionProperties(
  feature: SKSourceFeature,
  id: string,
  name: string,
  population: number,
): SKSourceFeature {
  return {
    ...feature,
    properties: {
      ...(feature.properties ?? {}),
      [SK_SOURCE_ID_PROPERTY]: id,
      [SK_NAME_PROPERTY]: name,
      [SK_POPULATION_PROPERTY]: population,
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
    throw new Error(`[SK] Missing ${fieldName} for ${label}.`);
  }
  return name;
}

function loadSKRegionCollection(
  context: SKBundleContext,
  relativePath: string,
  label: string,
) {
  return toPolygonFeatureCollection(
    loadGeoJSON(
      resolveSKRequiredSourcePath(context.sourceRoot, relativePath, label),
    ),
  );
}

/**
 * `obec code -> population`, summed from the bundle's OWN chochos.
 *
 * Deliberately not the national `population` field on `obce.geojson`: a bundle
 * is a subset of a country and its regions must total what the bundle actually
 * models, or the overlay contradicts the map beside it.
 */
function buildBundleObecPopulationIndex(
  context: SKBundleContext,
): Map<string, number> {
  const chochoSelected = loadSKChochoSelected(context);
  const populationByObec = new Map<string, number>();

  for (const feature of chochoSelected.features) {
    const properties = feature.properties ?? {};
    const obecCode = normalizeSKMunicipalityCode(properties.municipality_code);
    if (!obecCode || !context.municipalityCodes.has(obecCode)) {
      continue;
    }
    const population = resolveSKPopulation(
      properties,
      'pop_total',
      `chocho ${String(properties.chocho_key ?? '').trim()}`,
    );
    populationByObec.set(
      obecCode,
      (populationByObec.get(obecCode) ?? 0) + population,
    );
  }

  return populationByObec;
}

export function buildSKObceSourceCollection(context: SKBundleContext) {
  const sourceCollection = loadSKRegionCollection(
    context,
    SK_OBCE_FILE,
    'SK obce regions',
  );
  const populationByObec = buildBundleObecPopulationIndex(context);
  const features: SKSourceFeature[] = [];

  for (const feature of sourceCollection.features) {
    const properties = feature.properties ?? {};
    const obecCode = normalizeSKMunicipalityCode(properties.obec_code);
    if (!obecCode || !context.municipalityCodes.has(obecCode)) {
      continue;
    }

    features.push(
      withSKRegionProperties(
        feature,
        obecCode,
        readRequiredName(properties, 'obec_name', `obec ${obecCode}`),
        populationByObec.get(obecCode) ?? 0,
      ),
    );
  }

  return { type: 'FeatureCollection' as const, features };
}

export function buildSKOkresSourceCollection(context: SKBundleContext) {
  const sourceCollection = loadSKRegionCollection(
    context,
    SK_OKRES_FILE,
    'SK okres regions',
  );
  const populationByObec = buildBundleObecPopulationIndex(context);
  const features: SKSourceFeature[] = [];

  for (const feature of sourceCollection.features) {
    const properties = feature.properties ?? {};
    const okresCode = String(properties.okres_code ?? '').trim();
    if (!okresCode) {
      throw new Error('[SK] okres.geojson feature is missing okres_code.');
    }

    // Comma-joined string, not a JSON array — see SK_MUNICIPALITY_CODES_SEPARATOR.
    const rawMembers = String(properties.municipality_codes ?? '').trim();
    if (!rawMembers) {
      throw new Error(`[SK] Missing municipality_codes for okres ${okresCode}.`);
    }

    let population = 0;
    let hasIncludedMunicipality = false;
    for (const entry of rawMembers.split(SK_MUNICIPALITY_CODES_SEPARATOR)) {
      const municipalityCode = normalizeSKMunicipalityCode(entry);
      if (!municipalityCode || !context.municipalityCodes.has(municipalityCode)) {
        continue;
      }
      hasIncludedMunicipality = true;
      population += populationByObec.get(municipalityCode) ?? 0;
    }

    // An okres none of whose obce are in this bundle is not part of this map.
    if (!hasIncludedMunicipality) {
      continue;
    }

    features.push(
      withSKRegionProperties(
        feature,
        okresCode,
        readRequiredName(properties, 'okres_name', `okres ${okresCode}`),
        population,
      ),
    );
  }

  return { type: 'FeatureCollection' as const, features };
}

/**
 * ZSJ needs no aggregation, which is where SK diverges from CZ.
 *
 * CZ's chocho_key is `parent_obec(6) + zsj_dil(7)`, so its extractor has to
 * dissolve díly back into a ZSJ and strip a ` díl N` suffix off the name. SK's
 * `zsj_code` IS the chocho_key verbatim (`SK01012045520`), so the bundle's
 * chochos index straight into the national layer by equality — and the
 * population comes from the chocho that shares the key, not from a re-sum.
 */
export function buildSKZsjSourceCollection(context: SKBundleContext) {
  const sourceCollection = loadSKRegionCollection(
    context,
    SK_ZSJ_FILE,
    'SK ZSJ regions',
  );

  const chochoSelected = loadSKChochoSelected(context);
  const populationByZsj = new Map<string, number>();
  for (const feature of chochoSelected.features) {
    const properties = feature.properties ?? {};
    const key = String(properties.chocho_key ?? '').trim();
    if (!key) {
      continue;
    }
    const population = resolveSKPopulation(properties, 'pop_total', `chocho ${key}`);
    populationByZsj.set(key, (populationByZsj.get(key) ?? 0) + population);
  }

  if (populationByZsj.size === 0) {
    throw new Error(
      '[SK] chocho_selected.geojson yielded no chocho_key values — the ZSJ ' +
        'layer would be empty. Check that the bundle ran the prepare stage.',
    );
  }

  const features: SKSourceFeature[] = [];
  for (const feature of sourceCollection.features) {
    const properties = feature.properties ?? {};
    const zsjCode = String(properties.zsj_code ?? '').trim();
    if (!zsjCode || !populationByZsj.has(zsjCode)) {
      continue;
    }

    features.push(
      withSKRegionProperties(
        feature,
        zsjCode,
        readRequiredName(properties, 'zsj_name', `ZSJ ${zsjCode}`),
        populationByZsj.get(zsjCode) ?? 0,
      ),
    );
  }

  return { type: 'FeatureCollection' as const, features };
}
