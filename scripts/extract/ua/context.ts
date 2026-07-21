import {
  loadBundlePhaseInputGeoJson,
  loadExternalBundleContext,
  resolveExternalBundleRecord,
  resolveExternalSourceDataRoot,
  toPolygonFeatureCollection,
} from '../external/context';
import { UA_COUNTRY_CODE } from './constants';
import type { UABundleContext } from './types';

const normalizeCode = (value: unknown) => String(value ?? '').trim();

export function resolveUASourceDataRoot(): string {
  return resolveExternalSourceDataRoot();
}

export function loadUABundleContext(
  sourceRoot: string,
  bundleId: string,
): UABundleContext {
  const bundle = resolveExternalBundleRecord(sourceRoot, bundleId.trim(), 'UA');
  return loadExternalBundleContext({
    sourceRoot,
    bundle,
    countryCode: UA_COUNTRY_CODE,
    municipalityCodeLength: 12,
    normalizeMunicipalityCode: normalizeCode,
  });
}

export function loadUAChochoSelected(context: UABundleContext) {
  return toPolygonFeatureCollection(
    loadBundlePhaseInputGeoJson(context, 'chocho_selected.geojson'),
  );
}
