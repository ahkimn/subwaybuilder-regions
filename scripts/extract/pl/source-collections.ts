import type { Feature, MultiPolygon, Polygon } from 'geojson';

import { loadGeoJSON } from '../../utils/files';
import { toPolygonFeatureCollection } from '../external/context';
import {
  PL_GMINA_FILE,
  PL_NAME_PROPERTY,
  PL_POPULATION_PROPERTY,
  PL_POWIAT_FILE,
  PL_SOURCE_ID_PROPERTY,
} from './constants';
import {
  buildPLGminaPopulationIndex,
  loadPLChochoSelected,
  loadPLGminaIndex,
  normalizePLGminaCode,
  normalizePLPowiatCode,
  resolvePLPopulation,
  resolvePLRequiredSourcePath,
} from './context';
import type { PLBundleContext } from './types';

type PLSourceFeature = Feature<Polygon | MultiPolygon>;

function withPLRegionProperties(
  feature: PLSourceFeature,
  id: string,
  name: string,
  population: number,
): PLSourceFeature {
  return {
    ...feature,
    properties: {
      ...(feature.properties ?? {}),
      [PL_SOURCE_ID_PROPERTY]: id,
      [PL_NAME_PROPERTY]: name,
      [PL_POPULATION_PROPERTY]: population,
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
    throw new Error(`[PL] Missing ${fieldName} for ${label}.`);
  }
  return name;
}

function resolveMunicipalityCodeSet(
  value: unknown,
  label: string,
): Set<string> {
  if (!Array.isArray(value)) {
    throw new Error(`[PL] Missing municipality_codes for ${label}.`);
  }
  const codes = new Set<string>();
  for (const entry of value) {
    const code = normalizePLGminaCode(entry);
    if (code) {
      codes.add(code);
    }
  }
  if (codes.size === 0) {
    throw new Error(`[PL] Empty municipality_codes for ${label}.`);
  }
  return codes;
}

export function buildPLGminaSourceCollection(context: PLBundleContext) {
  const sourceCollection = toPolygonFeatureCollection(
    loadGeoJSON(
      resolvePLRequiredSourcePath(
        context.sourceRoot,
        PL_GMINA_FILE,
        'PL gmina regions',
      ),
    ),
  );
  const populationIndex = buildPLGminaPopulationIndex(context);
  const features: PLSourceFeature[] = [];

  for (const feature of sourceCollection.features) {
    const properties = feature.properties ?? {};
    const gminaCode = normalizePLGminaCode(properties.gmina_code);
    if (!gminaCode || !context.municipalityCodes.has(gminaCode)) {
      continue;
    }
    features.push(
      withPLRegionProperties(
        feature,
        gminaCode,
        readRequiredName(properties, 'gmina_name', `gmina ${gminaCode}`),
        populationIndex.get(gminaCode) ?? 0,
      ),
    );
  }

  return {
    type: 'FeatureCollection' as const,
    features,
  };
}

export function buildPLPowiatSourceCollection(context: PLBundleContext) {
  const sourceCollection = toPolygonFeatureCollection(
    loadGeoJSON(
      resolvePLRequiredSourcePath(
        context.sourceRoot,
        PL_POWIAT_FILE,
        'PL powiat regions',
      ),
    ),
  );
  const gminaIndex = loadPLGminaIndex(context.sourceRoot);
  const gminaPopulationIndex = buildPLGminaPopulationIndex(context);
  const features: PLSourceFeature[] = [];

  for (const feature of sourceCollection.features) {
    const properties = feature.properties ?? {};
    const powiatCode = normalizePLPowiatCode(properties.powiat_code);
    if (!powiatCode) {
      throw new Error('[PL] powiat.geojson feature is missing powiat_code.');
    }

    const powiatMunicipalityCodes = resolveMunicipalityCodeSet(
      properties.municipality_codes,
      `powiat ${powiatCode}`,
    );
    let population = 0;
    let hasIncludedMunicipality = false;
    for (const gminaCode of powiatMunicipalityCodes) {
      if (!context.municipalityCodes.has(gminaCode)) {
        continue;
      }
      hasIncludedMunicipality = true;
      // Prefer the chocho-derived per-bundle sum; fall back to the canonical
      // (currently always 0) value if a gmina happens to have no rejony in
      // the bundle (defensive — shouldn't happen in practice).
      population +=
        gminaPopulationIndex.get(gminaCode) ??
        gminaIndex.get(gminaCode)?.population ??
        0;
    }
    if (!hasIncludedMunicipality) {
      continue;
    }

    features.push(
      withPLRegionProperties(
        feature,
        powiatCode,
        readRequiredName(properties, 'powiat_name', `powiat ${powiatCode}`),
        population,
      ),
    );
  }

  return {
    type: 'FeatureCollection' as const,
    features,
  };
}

export function buildPLRejonSourceCollection(context: PLBundleContext) {
  const chochoSelected = loadPLChochoSelected(context);
  const features: PLSourceFeature[] = [];

  for (const feature of chochoSelected.features) {
    const properties = feature.properties ?? {};
    const gminaCode = normalizePLGminaCode(properties.municipality_code);
    if (!context.municipalityCodes.has(gminaCode)) {
      continue;
    }

    const chochoKey = String(properties.chocho_key ?? '').trim();
    if (!chochoKey) {
      throw new Error('[PL] chocho_selected feature is missing chocho_key.');
    }

    // PL rejony are anonymous statistical tracts (no GUS-published name).
    // Use the chocho_key as the display name; future work can substitute
    // OSM-derived dzielnica labels for urban rejony.
    features.push(
      withPLRegionProperties(
        feature,
        chochoKey,
        chochoKey,
        resolvePLPopulation(properties, 'pop_total', `rejon ${chochoKey}`),
      ),
    );
  }

  return {
    type: 'FeatureCollection' as const,
    features,
  };
}
