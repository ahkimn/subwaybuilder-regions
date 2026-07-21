import * as turf from '@turf/turf';
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

function resolveMunicipalityCodeSet(
  value: unknown,
  label: string,
): Set<string> {
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

function buildBundleObecPopulationIndex(
  context: CZBundleContext,
): Map<string, number> {
  const chochoSelected = loadCZChochoSelected(context);
  const populationByObec = new Map<string, number>();

  for (const feature of chochoSelected.features) {
    const properties = feature.properties ?? {};
    const obecCode = normalizeCZMunicipalityCode(properties.municipality_code);
    if (!obecCode || !context.municipalityCodes.has(obecCode)) {
      continue;
    }
    const population = resolveCZPopulation(
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
  const populationByObec = buildBundleObecPopulationIndex(context);
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
        populationByObec.get(obecCode) ?? 0,
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
  const populationByObec = buildBundleObecPopulationIndex(context);
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
      population += populationByObec.get(municipalityCode) ?? 0;
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

// chocho_key is parent_obec_code(6) + zsj_dil_code(7) = 13 chars. The
// trailing digit of zsj_dil_code is the díl suffix; the first 6 are the
// ZSJ code itself. So 12 chars = parent_obec(6) + zsj(6) = the canonical
// ZSJ identity that we aggregate díly into.
const CZ_ZSJ_KEY_LENGTH = 12;
// Per the CIS schema, multi-díl ZSJ names follow `<ZSJ-name> díl <N>`
// uniformly (e.g. "Bavoryně díl 1", "Bavoryně díl 2"). Singleton ZSJs
// carry the bare ZSJ name with no suffix. Stripping this pattern recovers
// the ZSJ name in either case (no-op for singletons).
const CZ_DIL_NAME_SUFFIX_PATTERN = / díl \d+$/u;

type CZZsjAggregate = {
  zsjKey: string; // 12 chars
  name: string;
  population: number;
  members: CZSourceFeature[];
};

/**
 * Dissolve adjacent díly into a single polygon. turf.union performs a true
 * geometric union (shared edges collapse) so the output is one Polygon when
 * the díly are contiguous and a MultiPolygon when they're disjoint (rare —
 * the CIS partitions ZSJs into adjacent díly by construction). Falls back
 * to a coordinate concat if the union ever returns null (topology edge
 * case) so we never lose a feature.
 */
function dissolveZsjMembers(
  members: CZSourceFeature[],
): Polygon | MultiPolygon {
  if (members.length === 1) {
    return members[0].geometry;
  }
  const collection = turf.featureCollection(members);
  const dissolved = turf.union(collection);
  if (dissolved && dissolved.geometry) {
    return dissolved.geometry as Polygon | MultiPolygon;
  }
  const fallbackPolygons: Polygon['coordinates'][] = [];
  for (const member of members) {
    if (member.geometry.type === 'Polygon') {
      fallbackPolygons.push(member.geometry.coordinates);
    } else {
      fallbackPolygons.push(...member.geometry.coordinates);
    }
  }
  return { type: 'MultiPolygon', coordinates: fallbackPolygons };
}

function buildZsjAggregateFeature(agg: CZZsjAggregate): CZSourceFeature {
  const geometry = dissolveZsjMembers(agg.members);
  const template = agg.members[0];
  // Strip any precomputed label-point hints inherited from the first díl —
  // they'd anchor the displayed label to that díl's centroid instead of the
  // dissolved-polygon centroid that the downstream label resolver computes.
  const inherited = { ...(template.properties ?? {}) };
  delete inherited.LAT;
  delete inherited.LNG;
  delete inherited.centroid_lat;
  delete inherited.centroid_lng;
  return withCZRegionProperties(
    {
      type: 'Feature',
      geometry,
      properties: { ...inherited, pop_total: agg.population },
    },
    agg.zsjKey,
    agg.name,
    agg.population,
  );
}

export function buildCZZsjSourceCollection(context: CZBundleContext) {
  const chochoSelected = loadCZChochoSelected(context);
  const namesByChochoKey = loadCZZsjDilNameIndex(context.sourceRoot);
  const aggregates = new Map<string, CZZsjAggregate>();

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

    const zsjKey = chochoKey.slice(0, CZ_ZSJ_KEY_LENGTH);
    const zsjName = nameRow.name.replace(CZ_DIL_NAME_SUFFIX_PATTERN, '');
    const pop = resolveCZPopulation(
      properties,
      'pop_total',
      `chocho ${chochoKey}`,
    );

    const existing = aggregates.get(zsjKey);
    if (existing) {
      existing.population += pop;
      existing.members.push(feature);
      // Keep the first-encountered name; for multi-díl ZSJs all díly share
      // the same stripped name so this is stable in practice.
    } else {
      aggregates.set(zsjKey, {
        zsjKey,
        name: zsjName,
        population: pop,
        members: [feature],
      });
    }
  }

  return {
    type: 'FeatureCollection' as const,
    features: Array.from(aggregates.values()).map(buildZsjAggregateFeature),
  };
}
