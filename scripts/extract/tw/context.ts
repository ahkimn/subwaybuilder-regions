import { DBFFile } from 'dbffile';
import fs from 'fs-extra';
import path from 'path';

import { parseNumber } from '../../utils/cli';
import { loadCSV, loadGeoJSON } from '../../utils/files';
import type { BilingualNameParts } from '../bilingual-names';
import { cleanName } from '../bilingual-names';
import {
  assertExternalSourcePathExists,
  loadExternalBundleContext,
  normalizeDigitsToLength,
  resolveExternalBundleRecord,
  resolveExternalSourceDataRoot,
  toPolygonFeatureCollection,
} from '../external/context';
import {
  TW_CHOCHO_KEY_LENGTH,
  TW_CHOCHO_SETS_DIR,
  TW_COUNTRY_CODE,
  TW_MOI_VILLAGE_BOUNDARIES_DIR,
  TW_MUNICIPALITIES_FILE,
  TW_MUNICIPALITY_CODE_LENGTH,
  TW_PREF_CODE_LENGTH,
} from './constants';
import type { TWBundleContext } from './types';

const TW_VILLAGE_ENG_SUFFIX_RE = /\s+Vil\.\s*$/;

export function normalizeTWPrefCode(value: unknown): string {
  return normalizeDigitsToLength(value, TW_PREF_CODE_LENGTH);
}

export function normalizeTWMunicipalityCode(value: unknown): string {
  return normalizeDigitsToLength(value, TW_MUNICIPALITY_CODE_LENGTH);
}

export function normalizeTWChochoKey(value: unknown): string {
  return normalizeDigitsToLength(value, TW_CHOCHO_KEY_LENGTH);
}

export function cleanTWEnglishName(value: unknown): string {
  return cleanName(value).replace(TW_VILLAGE_ENG_SUFFIX_RE, '');
}

export function resolveTWSourceDataRoot(): string {
  return resolveExternalSourceDataRoot();
}

export function resolveTWBundleRecord(sourceRoot: string, bundleId: string) {
  return resolveExternalBundleRecord(sourceRoot, bundleId.trim(), 'TW');
}

export function resolveTWRequiredSourcePath(
  sourceRoot: string,
  relativePath: string,
  label: string,
): string {
  const targetPath = path.resolve(sourceRoot, relativePath);
  assertExternalSourcePathExists(targetPath, label, 'TW');
  return targetPath;
}

function loadTWMunicipalityNameIndex(
  sourceRoot: string,
): Map<string, BilingualNameParts> {
  const rows = loadCSV(
    resolveTWRequiredSourcePath(
      sourceRoot,
      TW_MUNICIPALITIES_FILE,
      'TW municipality labels',
    ),
  );
  const index = new Map<string, BilingualNameParts>();

  for (const row of rows) {
    const rawCode = cleanName(row.muni_code);
    if (!/^\d{5}$|^\d{8}$/.test(rawCode)) {
      continue;
    }
    const native = cleanName(row.muni_name);
    const en = cleanName(row.muni_name_en);
    if (!native && !en) {
      continue;
    }
    index.set(rawCode, { native, en });
  }

  if (index.size === 0) {
    throw new Error(
      '[TW] No municipality labels found in tw_municipalities.csv.',
    );
  }

  return index;
}

function resolveTWVillageDbfPath(sourceRoot: string): string {
  const directory = resolveTWRequiredSourcePath(
    sourceRoot,
    TW_MOI_VILLAGE_BOUNDARIES_DIR,
    'TW MOI village boundary directory',
  );
  const dbfFileNames = fs
    .readdirSync(directory)
    .filter((entry) => /^VILLAGE_NLSC_.*\.dbf$/i.test(entry))
    .sort();
  const dbfFileName = dbfFileNames[dbfFileNames.length - 1];

  if (!dbfFileName) {
    throw new Error(`[TW] Missing MOI village DBF in ${directory}.`);
  }

  return path.resolve(directory, dbfFileName);
}

async function loadTWVillageEnglishNameIndex(
  sourceRoot: string,
): Promise<Map<string, string>> {
  const dbf = await DBFFile.open(resolveTWVillageDbfPath(sourceRoot), {
    readMode: 'loose',
  });
  const rows = await dbf.readRecords();
  const index = new Map<string, string>();

  for (const row of rows) {
    const chochoKey = normalizeTWChochoKey(row.VILLCODE);
    const nameEn = cleanTWEnglishName(row.VILLENG);
    if (chochoKey && nameEn && !index.has(chochoKey)) {
      index.set(chochoKey, nameEn);
    }
  }

  return index;
}

export async function loadTWBundleContext(
  sourceRoot: string,
  bundleId: string,
): Promise<TWBundleContext> {
  const bundle = resolveTWBundleRecord(sourceRoot, bundleId);
  const context = loadExternalBundleContext({
    sourceRoot,
    bundle,
    countryCode: TW_COUNTRY_CODE,
    municipalityCodeLength: TW_MUNICIPALITY_CODE_LENGTH,
    prefCodeLength: TW_PREF_CODE_LENGTH,
    normalizeMunicipalityCode: normalizeTWMunicipalityCode,
  });

  return {
    ...context,
    municipalityNamesByCode: loadTWMunicipalityNameIndex(sourceRoot),
    villageEnglishNamesByCode: await loadTWVillageEnglishNameIndex(sourceRoot),
  };
}

export function loadTWChochoSet(context: TWBundleContext) {
  const bundleId = context.bundle.bundle_id;
  return toPolygonFeatureCollection(
    loadGeoJSON(
      resolveTWRequiredSourcePath(
        context.sourceRoot,
        path.join(TW_CHOCHO_SETS_DIR, `${bundleId}.geojson`),
        `TW chocho set for ${bundleId}`,
      ),
    ),
  );
}

export function resolveTWPopulation(
  properties: GeoJSON.GeoJsonProperties,
  label: string,
): number {
  const population =
    parseNumber(properties?.population) ?? parseNumber(properties?.pop_total);
  if (population === undefined) {
    throw new Error(`[TW] Missing numeric population for ${label}.`);
  }
  return population;
}
