import {
  loadBundlePhaseInputGeoJson,
  loadExternalBundleContext,
  normalizeDigitsToLength,
  resolveExternalBundleRecord,
  resolveExternalSourceDataRoot,
  toPolygonFeatureCollection,
} from '../external/context';
import { EE_COUNTRY_CODE } from './constants';
import type { EEBundleContext } from './types';

export function resolveEESourceDataRoot(): string {
  return resolveExternalSourceDataRoot();
}

export function loadEEBundleContext(
  sourceRoot: string,
  bundleId: string,
): EEBundleContext {
  const bundle = resolveExternalBundleRecord(sourceRoot, bundleId.trim(), 'EE');
  return loadExternalBundleContext({
    sourceRoot,
    bundle,
    countryCode: EE_COUNTRY_CODE,
    municipalityCodeLength: 4,
    prefCodeLength: 4,
    normalizeMunicipalityCode: (value) => normalizeDigitsToLength(value, 4),
  });
}

export function loadEEChochoSelected(context: EEBundleContext) {
  return toPolygonFeatureCollection(
    loadBundlePhaseInputGeoJson(context, 'chocho_selected.geojson'),
  );
}

export function loadEEOmavalitsusedSelected(context: EEBundleContext) {
  return toPolygonFeatureCollection(
    loadBundlePhaseInputGeoJson(
      context,
      'region_municipality_selected.geojson',
    ),
  );
}
