import path from 'path';

import { parseNumber } from '../../utils/cli';
import { loadCSV, loadGeoJSON } from '../../utils/files';
import {
  assertExternalSourcePathExists,
  loadBundlePhaseInputGeoJson,
  loadExternalBundleContext,
  normalizeDigitsToLength,
  resolveExternalBundleRecord,
  resolveExternalSourceDataRoot,
  toPolygonFeatureCollection,
} from '../external/context';
import {
  CZ_COUNTRY_CODE,
  CZ_MUNICIPALITY_CODE_LENGTH,
  CZ_OBCE_FILE,
  CZ_ZSJ_DIL_NAMES_FILE,
} from './constants';
import type { CZBundleContext, CZObecRegion, CZZsjDilNameRow } from './types';

export function normalizeCZMunicipalityCode(value: unknown): string {
  return normalizeDigitsToLength(value, CZ_MUNICIPALITY_CODE_LENGTH);
}

export function resolveCZSourceDataRoot(): string {
  return resolveExternalSourceDataRoot();
}

export function resolveCZBundleRecord(sourceRoot: string, bundleId: string) {
  return resolveExternalBundleRecord(sourceRoot, bundleId.trim(), 'CZ');
}

export function resolveCZRequiredSourcePath(
  sourceRoot: string,
  relativePath: string,
  label: string,
): string {
  const targetPath = path.resolve(sourceRoot, relativePath);
  assertExternalSourcePathExists(targetPath, label, 'CZ');
  return targetPath;
}

export function loadCZBundleContext(
  sourceRoot: string,
  bundleId: string,
): CZBundleContext {
  const bundle = resolveCZBundleRecord(sourceRoot, bundleId);
  return loadExternalBundleContext({
    sourceRoot,
    bundle,
    countryCode: CZ_COUNTRY_CODE,
    municipalityCodeLength: CZ_MUNICIPALITY_CODE_LENGTH,
  });
}

export function loadCZChochoSelected(context: CZBundleContext) {
  return toPolygonFeatureCollection(
    loadBundlePhaseInputGeoJson(context, 'chocho_selected.geojson'),
  );
}

function resolveRequiredString(
  properties: GeoJSON.GeoJsonProperties,
  fieldName: string,
  label: string,
): string {
  const value = properties?.[fieldName];
  const normalized = typeof value === 'string' ? value.trim() : String(value ?? '');
  if (!normalized) {
    throw new Error(`[CZ] Missing ${fieldName} for ${label}.`);
  }
  return normalized;
}

export function resolveCZPopulation(
  properties: GeoJSON.GeoJsonProperties,
  fieldName: string,
  label: string,
): number {
  const population = parseNumber(properties?.[fieldName]);
  if (population === undefined) {
    throw new Error(`[CZ] Missing numeric ${fieldName} for ${label}.`);
  }
  return population;
}

export function loadCZObecPopulationIndex(
  sourceRoot: string,
): Map<string, CZObecRegion> {
  const collection = toPolygonFeatureCollection(
    loadGeoJSON(
      resolveCZRequiredSourcePath(sourceRoot, CZ_OBCE_FILE, 'CZ obce regions'),
    ),
  );
  const index = new Map<string, CZObecRegion>();

  for (const feature of collection.features) {
    const properties = feature.properties ?? {};
    const code = normalizeCZMunicipalityCode(properties.obec_code);
    if (!code) {
      throw new Error('[CZ] obce.geojson feature is missing obec_code.');
    }
    index.set(code, {
      code,
      name: resolveRequiredString(properties, 'obec_name', `obec ${code}`),
      population: resolveCZPopulation(properties, 'population', `obec ${code}`),
    });
  }

  return index;
}

export function loadCZZsjDilNameIndex(
  sourceRoot: string,
): Map<string, CZZsjDilNameRow> {
  const rows = loadCSV(
    resolveCZRequiredSourcePath(
      sourceRoot,
      CZ_ZSJ_DIL_NAMES_FILE,
      'CZ ZSJ-díl labels',
    ),
  );
  const index = new Map<string, CZZsjDilNameRow>();

  for (const row of rows) {
    const chochoKey = String(row.chocho_key ?? '').trim();
    const name = String(row.name ?? '').trim();
    if (!chochoKey || !name) {
      throw new Error(
        '[CZ] zsj_dil_names.csv requires non-empty chocho_key and name columns.',
      );
    }
    index.set(chochoKey, { chochoKey, name });
  }

  return index;
}
