import {
  loadBundlePhaseInputGeoJson,
  loadExternalBundleContext,
  resolveExternalBundleRecord,
  resolveExternalSourceDataRoot,
  toPolygonFeatureCollection,
} from '../external/context';
import { HU_COUNTRY_CODE } from './constants';
import type { HUBundleContext } from './types';

export function resolveHUSourceDataRoot(): string {
  return resolveExternalSourceDataRoot();
}

export function loadHUBundleContext(
  sourceRoot: string,
  bundleId: string,
): HUBundleContext {
  const bundle = resolveExternalBundleRecord(sourceRoot, bundleId.trim(), 'HU');
  return loadExternalBundleContext({
    sourceRoot,
    bundle,
    countryCode: HU_COUNTRY_CODE,
    // KSH település codes are 5-digit with significant leading zeros
    // (Dunaújváros is 03115; Budapest kerületek are 00001..00023).
    municipalityCodeLength: 5,
    normalizeMunicipalityCode: (value) => String(value ?? '').trim(),
  });
}

// Járás districts intersecting the bundle boundary, with Budapest dissolved
// to ONE unit (the operator's "járás-equivalent"); emitted by jp-data's
// scripts/hu/hu_region_support_files.py from OSM admin_level=7 (the CURRENT
// 174-district system — GADM ADM2 carries the abolished pre-2013 kistérség
// set and is deliberately not used).
export function loadHUJarasSelected(context: HUBundleContext) {
  return toPolygonFeatureCollection(
    loadBundlePhaseInputGeoJson(context, 'region_jaras_selected.geojson'),
  );
}

// Települések intersecting the boundary, with Budapest's 23 kerületek as
// first-class units under their FORMAL names ("Budapest VI. kerület").
// No sub-municipal layer exists for HU: the sub-settlement chochos are
// synthetic cadastral blocks, not named places.
export function loadHUTelepulesSelected(context: HUBundleContext) {
  return toPolygonFeatureCollection(
    loadBundlePhaseInputGeoJson(context, 'region_telepules_selected.geojson'),
  );
}
