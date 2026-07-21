import {
  loadBundlePhaseInputGeoJson,
  loadExternalBundleContext,
  resolveExternalBundleRecord,
  resolveExternalSourceDataRoot,
  toPolygonFeatureCollection,
} from '../external/context';
import { LV_COUNTRY_CODE } from './constants';
import type { LVBundleContext } from './types';

export function resolveLVSourceDataRoot(): string {
  return resolveExternalSourceDataRoot();
}

export function loadLVBundleContext(
  sourceRoot: string,
  bundleId: string,
): LVBundleContext {
  const bundle = resolveExternalBundleRecord(sourceRoot, bundleId.trim(), 'LV');
  return loadExternalBundleContext({
    sourceRoot,
    bundle,
    countryCode: LV_COUNTRY_CODE,
    // ATVK 2021 local government units carry 7-digit codes.
    municipalityCodeLength: 7,
    normalizeMunicipalityCode: (value) => String(value ?? '').trim(),
  });
}

export function loadLVChochoSelected(context: LVBundleContext) {
  return toPolygonFeatureCollection(
    loadBundlePhaseInputGeoJson(context, 'chocho_selected.geojson'),
  );
}

// Fully-tiling administrative sub-municipal grain (apkaimes in-city +
// pilsētas / pagasti elsewhere) with DPA-free geometry, emitted by jp-data's
// prepare stage. Preferred over the DPA-fragmented chocho layer for the
// neighbourhoods & parishes dataset.
export function loadLVSubMunicipalSelected(context: LVBundleContext) {
  return toPolygonFeatureCollection(
    loadBundlePhaseInputGeoJson(context, 'sub_municipal_selected.geojson'),
  );
}

export function loadLVMunicipalitiesSelected(context: LVBundleContext) {
  return toPolygonFeatureCollection(
    loadBundlePhaseInputGeoJson(
      context,
      'region_municipality_selected.geojson',
    ),
  );
}
