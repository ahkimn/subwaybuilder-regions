import path from 'path';

import { parseNumber } from '../../utils/cli';
import {
  assertExternalSourcePathExists,
  loadBundlePhaseInputGeoJson,
  loadExternalBundleContext,
  normalizeDigitsToLength,
  resolveExternalBundleRecord,
  resolveExternalSourceDataRoot,
  toPolygonFeatureCollection,
} from '../external/context';
import { SK_COUNTRY_CODE, SK_MUNICIPALITY_CODE_LENGTH } from './constants';
import type { SKBundleContext } from './types';

/**
 * The 6-digit obec code, from either `528595` or `SK0101528595`.
 *
 * The pipeline writes both spellings — `chocho_selected.obec_code` is the full
 * LAU while `municipality_code` is the bare six digits. Taking the last six
 * digits normalises them without having to know which field it came from.
 * `normalizeDigitsToLength` strips the `SK` prefix first, so what reaches the
 * truncation is always numeric.
 */
export function normalizeSKMunicipalityCode(value: unknown): string {
  return normalizeDigitsToLength(value, SK_MUNICIPALITY_CODE_LENGTH);
}

export function resolveSKSourceDataRoot(): string {
  return resolveExternalSourceDataRoot();
}

export function resolveSKBundleRecord(sourceRoot: string, bundleId: string) {
  return resolveExternalBundleRecord(sourceRoot, bundleId.trim(), 'SK');
}

export function resolveSKRequiredSourcePath(
  sourceRoot: string,
  relativePath: string,
  label: string,
): string {
  const targetPath = path.resolve(sourceRoot, relativePath);
  assertExternalSourcePathExists(targetPath, label, 'SK');
  return targetPath;
}

export function loadSKBundleContext(
  sourceRoot: string,
  bundleId: string,
): SKBundleContext {
  const bundle = resolveSKBundleRecord(sourceRoot, bundleId);
  return loadExternalBundleContext({
    sourceRoot,
    bundle,
    countryCode: SK_COUNTRY_CODE,
    municipalityCodeLength: SK_MUNICIPALITY_CODE_LENGTH,
  });
}

export function loadSKChochoSelected(context: SKBundleContext) {
  return toPolygonFeatureCollection(
    loadBundlePhaseInputGeoJson(context, 'chocho_selected.geojson'),
  );
}

export function resolveSKPopulation(
  properties: GeoJSON.GeoJsonProperties,
  fieldName: string,
  label: string,
): number {
  const population = parseNumber(properties?.[fieldName]);
  if (population === undefined) {
    throw new Error(`[SK] Missing numeric ${fieldName} for ${label}.`);
  }
  return population;
}
