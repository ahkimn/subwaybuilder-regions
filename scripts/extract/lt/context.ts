import fs from 'fs-extra';
import path from 'path';

import {
  loadBundlePhaseInputGeoJson,
  loadExternalBundleContext,
  resolveExternalBundleRecord,
  resolveExternalSourceDataRoot,
  toPolygonFeatureCollection,
} from '../external/context';
import { LT_COUNTRY_CODE } from './constants';
import type { LTAdminNames, LTBundleContext } from './types';

const LT_ADMIN_NAMES_PATH = path.resolve(__dirname, 'lt-admin-names.json');

let cachedAdminNames: LTAdminNames | null = null;

export function resolveLTSourceDataRoot(): string {
  return resolveExternalSourceDataRoot();
}

export function loadLTBundleContext(
  sourceRoot: string,
  bundleId: string,
): LTBundleContext {
  const bundle = resolveExternalBundleRecord(sourceRoot, bundleId.trim(), 'LT');
  return loadExternalBundleContext({
    sourceRoot,
    bundle,
    countryCode: LT_COUNTRY_CODE,
    // boundary.geojson lists the FUA's savivaldybės as 2-digit codes.
    municipalityCodeLength: 2,
    normalizeMunicipalityCode: (value) => String(value ?? '').trim(),
  });
}

export function loadLTChochoSelected(context: LTBundleContext) {
  return toPolygonFeatureCollection(
    loadBundlePhaseInputGeoJson(context, 'chocho_selected.geojson'),
  );
}

// Savivaldybė (2-digit) and seniūnija (4-digit) names are not carried on the
// bundle chocho features; they are joined from a committed lookup derived from
// the jp-data INSPIRE Administrative Units layers (LT.RC.ADMVNT).
export function loadLTAdminNames(): LTAdminNames {
  if (!cachedAdminNames) {
    const data = fs.readJsonSync(LT_ADMIN_NAMES_PATH) as Partial<LTAdminNames>;
    cachedAdminNames = {
      savivaldybes: data.savivaldybes ?? {},
      seniunijos: data.seniunijos ?? {},
    };
  }
  return cachedAdminNames;
}
