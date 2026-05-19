import path from 'path';

import { parseNumber } from '../../utils/cli';
import { loadGeoJSON } from '../../utils/files';
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
  PL_COUNTRY_CODE,
  PL_GMINA_CODE_LENGTH,
  PL_GMINA_FILE,
  PL_POWIAT_CODE_LENGTH,
} from './constants';
import type { PLBundleContext, PLGminaRegion } from './types';

export function normalizePLGminaCode(value: unknown): string {
  return normalizeDigitsToLength(value, PL_GMINA_CODE_LENGTH);
}

export function normalizePLPowiatCode(value: unknown): string {
  return normalizeDigitsToLength(value, PL_POWIAT_CODE_LENGTH);
}

export function resolvePLSourceDataRoot(): string {
  return resolveExternalSourceDataRoot();
}

export function resolvePLBundleRecord(sourceRoot: string, bundleId: string) {
  return resolveExternalBundleRecord(sourceRoot, bundleId.trim(), 'PL');
}

export function resolvePLRequiredSourcePath(
  sourceRoot: string,
  relativePath: string,
  label: string,
): string {
  const targetPath = path.resolve(sourceRoot, relativePath);
  assertExternalSourcePathExists(targetPath, label, 'PL');
  return targetPath;
}

export function loadPLBundleContext(
  sourceRoot: string,
  bundleId: string,
): PLBundleContext {
  const bundle = resolvePLBundleRecord(sourceRoot, bundleId);
  return loadExternalBundleContext({
    sourceRoot,
    bundle,
    countryCode: PL_COUNTRY_CODE,
    municipalityCodeLength: PL_GMINA_CODE_LENGTH,
  });
}

export function loadPLChochoSelected(context: PLBundleContext) {
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
  const normalized =
    typeof value === 'string' ? value.trim() : String(value ?? '');
  if (!normalized) {
    throw new Error(`[PL] Missing ${fieldName} for ${label}.`);
  }
  return normalized;
}

export function resolvePLPopulation(
  properties: GeoJSON.GeoJsonProperties,
  fieldName: string,
  label: string,
): number {
  const population = parseNumber(properties?.[fieldName]);
  if (population === undefined) {
    throw new Error(`[PL] Missing numeric ${fieldName} for ${label}.`);
  }
  return population;
}

/**
 * Build a per-gmina population index by summing ``pop_total`` from the
 * bundle's chocho_selected (BREC rejon) features. PL canonical gmina.geojson
 * does not carry population (PRG ships geometry + name only); rejon-derived
 * sums are the authoritative per-bundle gmina pop, mirroring how the CZ okres
 * builder sums its member obce pops.
 */
export function buildPLGminaPopulationIndex(
  context: PLBundleContext,
): Map<string, number> {
  const chochoSelected = loadPLChochoSelected(context);
  const index = new Map<string, number>();
  for (const feature of chochoSelected.features) {
    const properties = feature.properties ?? {};
    const gminaCode = normalizePLGminaCode(properties.municipality_code);
    if (!gminaCode || !context.municipalityCodes.has(gminaCode)) {
      continue;
    }
    const pop = parseNumber(properties.pop_total) ?? 0;
    index.set(gminaCode, (index.get(gminaCode) ?? 0) + pop);
  }
  return index;
}

export function loadPLGminaIndex(
  sourceRoot: string,
): Map<string, PLGminaRegion> {
  const collection = toPolygonFeatureCollection(
    loadGeoJSON(
      resolvePLRequiredSourcePath(sourceRoot, PL_GMINA_FILE, 'PL gmina regions'),
    ),
  );
  const index = new Map<string, PLGminaRegion>();
  for (const feature of collection.features) {
    const properties = feature.properties ?? {};
    const code = normalizePLGminaCode(properties.gmina_code);
    if (!code) {
      throw new Error('[PL] gmina.geojson feature is missing gmina_code.');
    }
    index.set(code, {
      code,
      name: resolveRequiredString(properties, 'gmina_name', `gmina ${code}`),
      population: 0, // pop sourced from chocho_selected per bundle
      powiatCode: normalizePLPowiatCode(properties.powiat_code),
    });
  }
  return index;
}
