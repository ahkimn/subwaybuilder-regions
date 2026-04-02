import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import AdmZip from 'adm-zip';
import { DBFFile } from 'dbffile';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
import * as turf from '@turf/turf';

import { SOURCE_DATA_DIR } from '../../shared/constants';
import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { parseNumber } from '../utils/cli';
import { loadGeoJSON } from '../utils/files';
import {
  buildRegionsWithoutClipping,
  filterAndClipRegionsToBoundaryGeometry,
} from '../utils/geometry';
import { renderFeaturePreview } from '../utils/preview';
import { createDataConfigFromCatalog } from './data-config';
import type { DataConfig } from './handler-types';
import { saveBoundaries } from './process';

const JP_SOURCE_DATA_ROOT_ENV = 'SUBWAYBUILDER_JP_DATA_ROOT';
const DEFAULT_JP_SOURCE_DATA_ROOT = path.resolve(SOURCE_DATA_DIR, 'jp-data');
const BUNDLE_INDEX_PATH = path.join('bundles', 'index.json');
const N03_BOUNDARY_FILE = 'N03-20240101.geojson.gz';
const NEIGHBORHOOD_BOUNDARY_DIR = 'neighborhood7_boundaries';
const NEIGHBORHOOD_ZIP_TEMPLATE = 'A002005212020DDSWC{prefCode}.zip';
const SOURCE_ID_PROPERTY = 'SOURCE_ID';
const BILINGUAL_NAME_PROPERTY = 'NAME_BILINGUAL';
const JAPANESE_NAME_PROPERTY = 'NAME_JA_SOURCE';
const ENGLISH_NAME_PROPERTY = 'NAME_EN_SOURCE';
const POPULATION_PROPERTY = 'POPULATION';
const JAPANESE_TEXT_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;
const CHOME_SUFFIX_RE =
  /(?:[0-9\uFF10-\uFF19]+|[\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341\u767E\u3007\u96F6]+)\u4E01\u76EE$/;
const MACRON_MAP: ReadonlyArray<readonly [string, string]> = [
  ['ou', 'ō'],
  ['oo', 'ō'],
  ['aa', 'ā'],
  ['ii', 'ī'],
  ['uu', 'ū'],
  ['ee', 'ē'],
];
const JP_DATASET_ORDER = ['shichouson', 'ooaza'] as const;

type JPDatasetId = (typeof JP_DATASET_ORDER)[number];
type GeoBoundaryFeature = Feature<Polygon | MultiPolygon>;

type JPBundleIndexRecord = {
  bundle_id: string;
  city_code: string;
  boundary_path?: string;
  city_name_en?: string;
  city_name_ja?: string;
  country?: string;
};

type JPBoundaryMetadata = {
  boundaryFeature: GeoBoundaryFeature;
  municipalityCodes: string[];
  prefCodes: string[];
};

type JPBundleContext = {
  bundle: JPBundleIndexRecord;
  sourceRoot: string;
  boundaryFeature: GeoBoundaryFeature;
  municipalityCodes: Set<string>;
  prefCodes: string[];
  chochoSelected: FeatureCollection<Polygon | MultiPolygon>;
  municipalityPopulationMap: Map<string, number>;
};

type OazaBoundaryRow = {
  chochoKey: string;
  kcode1Base: string;
  oazaName: string;
};

type RegionNameParts = {
  ja: string;
  en: string;
};

const JP_DATA_CONFIGS: Record<JPDatasetId, DataConfig> = {
  shichouson: createDataConfigFromCatalog('shichouson', {
    idProperty: SOURCE_ID_PROPERTY,
    nameProperty: BILINGUAL_NAME_PROPERTY,
    applicableNameProperties: [BILINGUAL_NAME_PROPERTY],
    populationProperty: POPULATION_PROPERTY,
  }),
  ooaza: createDataConfigFromCatalog('ooaza', {
    idProperty: SOURCE_ID_PROPERTY,
    nameProperty: BILINGUAL_NAME_PROPERTY,
    applicableNameProperties: [BILINGUAL_NAME_PROPERTY],
    populationProperty: POPULATION_PROPERTY,
  }),
};

let kuroshiroInitPromise: Promise<Kuroshiro> | null = null;
const romajiCache = new Map<string, Promise<string>>();

function logProgressHeartbeat(
  label: string,
  current: number,
  total: number,
  percentStep = 10,
): void {
  if (total <= 0) {
    return;
  }

  if (current === total) {
    console.log(`[JP] ${label}: ${current}/${total} (100%)`);
    return;
  }

  const previousPercent = Math.floor(((current - 1) * 100) / total);
  const currentPercent = Math.floor((current * 100) / total);

  if (
    current === 1 ||
    Math.floor(previousPercent / percentStep) !==
      Math.floor(currentPercent / percentStep)
  ) {
    console.log(`[JP] ${label}: ${current}/${total} (${currentPercent}%)`);
  }
}

function resolveJPSourceDataRoot(): string {
  return path.resolve(
    process.env[JP_SOURCE_DATA_ROOT_ENV] || DEFAULT_JP_SOURCE_DATA_ROOT,
  );
}

function assertJPSourcePathExists(targetPath: string, label: string): void {
  if (!fs.existsSync(targetPath)) {
    throw new Error(
      `[JP] Missing ${label}: ${targetPath}. Run \`npm run link:jp-data\` or set ${JP_SOURCE_DATA_ROOT_ENV}.`,
    );
  }
}

function toFeatureCollection(
  geoJson: GeoJSON.FeatureCollection,
): FeatureCollection<Polygon | MultiPolygon> {
  return {
    type: 'FeatureCollection',
    features: geoJson.features.filter(isPolygonOrMultiPolygonFeature),
  };
}

function isPolygonOrMultiPolygonFeature(
  feature: GeoJSON.Feature,
): feature is GeoBoundaryFeature {
  return (
    feature.geometry?.type === 'Polygon' ||
    feature.geometry?.type === 'MultiPolygon'
  );
}

function normalizeDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeMunicipalityCode(value: unknown): string {
  const digits = normalizeDigits(value);
  return digits ? digits.padStart(5, '0').slice(-5) : '';
}

function normalizePrefCode(value: unknown): string {
  const digits = normalizeDigits(value);
  return digits ? digits.padStart(2, '0').slice(-2) : '';
}

function normalizeChochoKey(value: unknown): string {
  return normalizeDigits(value);
}

function normalizeKcode1Base(value: unknown): string {
  const baseText = String(value ?? '').trim().split('-', 1)[0] || '';
  const digits = normalizeDigits(baseText);
  return digits ? digits.padStart(4, '0').slice(-4) : '';
}

function normalizeSAreaBase(value: unknown): string {
  const digits = normalizeDigits(value);
  if (!digits) {
    return '';
  }
  const normalized = digits.padStart(6, '0').slice(-6);
  return normalized.slice(0, 4);
}

function normalizeBoundaryMunicipalityCode(
  municipalityValue: unknown,
  prefCodeValue?: unknown,
): string {
  const municipalityDigits = normalizeDigits(municipalityValue);
  if (!municipalityDigits) {
    return '';
  }
  if (municipalityDigits.length >= 5) {
    return municipalityDigits.slice(0, 5);
  }

  const prefDigits = normalizeDigits(prefCodeValue);
  if (prefDigits && municipalityDigits.length <= 3) {
    return (
      prefDigits.padStart(2, '0').slice(-2) +
      municipalityDigits.padStart(3, '0').slice(-3)
    );
  }

  return municipalityDigits.padStart(5, '0').slice(-5);
}

function cleanLabelName(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text || ['nan', 'none', 'null'].includes(text.toLowerCase())) {
    return '';
  }
  return text;
}

function collapseOazaName(value: unknown): string {
  const text = cleanLabelName(value).replace(/\s+/g, '');
  if (!text) {
    return '';
  }

  const collapsed = text.replace(CHOME_SUFFIX_RE, '');
  return collapsed || text;
}

function resolveNumericValue(value: unknown): number {
  const parsed = parseNumber(value);
  return parsed === undefined ? 0 : parsed;
}

function resolveChochoPopulation(properties: GeoJSON.GeoJsonProperties): number {
  // JP region populations are defined from chocho total population only.
  // Do not substitute working-age, employed, or other labor-force fields here.
  return resolveNumericValue(properties?.pop_total);
}

function resolveBoundaryFeatureCollection(
  boundaryGeoJson: GeoJSON.FeatureCollection,
): GeoBoundaryFeature {
  if (boundaryGeoJson.features.length !== 1) {
    throw new Error(
      '[JP] Expected boundary.geojson to contain exactly one feature.',
    );
  }

  const boundaryFeature = boundaryGeoJson.features[0];
  if (!isPolygonOrMultiPolygonFeature(boundaryFeature)) {
    throw new Error(
      '[JP] boundary.geojson must contain a Polygon or MultiPolygon feature.',
    );
  }

  return boundaryFeature;
}

function loadJPBundleIndex(sourceRoot: string): JPBundleIndexRecord[] {
  const indexPath = path.resolve(sourceRoot, BUNDLE_INDEX_PATH);
  assertJPSourcePathExists(indexPath, 'bundle index');
  const payload = fs.readJsonSync(indexPath) as {
    bundles?: JPBundleIndexRecord[];
  };
  return Array.isArray(payload.bundles) ? payload.bundles : [];
}

function resolveJPBundleRecord(
  sourceRoot: string,
  bundleId: string,
): JPBundleIndexRecord {
  const wantedBundle = cleanLabelName(bundleId);
  if (!wantedBundle) {
    throw new Error('[JP] Missing bundle id.');
  }

  const bundleRecord = loadJPBundleIndex(sourceRoot).find(
    (record) => record.bundle_id === wantedBundle,
  );
  if (!bundleRecord) {
    throw new Error(`[JP] Unknown bundle: ${wantedBundle}`);
  }
  return bundleRecord;
}

function loadBoundaryMetadata(bundleDir: string): JPBoundaryMetadata {
  const boundaryPath = path.resolve(bundleDir, 'phase_inputs', 'boundary.geojson');
  const boundaryGeoJson = loadGeoJSON(boundaryPath);
  const boundaryFeature = resolveBoundaryFeatureCollection(boundaryGeoJson);
  const properties = boundaryFeature.properties ?? {};

  const municipalityCodes = Array.isArray(properties.municipality_codes)
    ? properties.municipality_codes
        .map((value) => normalizeMunicipalityCode(value))
        .filter(Boolean)
    : [];
  if (municipalityCodes.length === 0) {
    throw new Error(
      `[JP] boundary.geojson is missing municipality_codes in ${boundaryPath}`,
    );
  }

  const prefCodes = Array.isArray(properties.pref_codes)
    ? properties.pref_codes.map((value) => normalizePrefCode(value)).filter(Boolean)
    : [];
  if (prefCodes.length === 0) {
    throw new Error(
      `[JP] boundary.geojson is missing pref_codes in ${boundaryPath}`,
    );
  }

  return {
    boundaryFeature,
    municipalityCodes: Array.from(new Set(municipalityCodes)).sort(),
    prefCodes: Array.from(new Set(prefCodes)).sort(),
  };
}

export function buildMunicipalityPopulationMap(
  chochoSelected: FeatureCollection<Polygon | MultiPolygon>,
): Map<string, number> {
  const populationMap = new Map<string, number>();

  for (const feature of chochoSelected.features) {
    const municipalityCode = normalizeBoundaryMunicipalityCode(
      feature.properties?.municipality_code,
      feature.properties?.pref_code,
    );
    if (!municipalityCode) {
      continue;
    }

    populationMap.set(
      municipalityCode,
      (populationMap.get(municipalityCode) || 0) +
        resolveChochoPopulation(feature.properties ?? {}),
    );
  }

  return populationMap;
}

function loadChochoSelected(
  bundleDir: string,
  municipalityCodes: ReadonlySet<string>,
): FeatureCollection<Polygon | MultiPolygon> {
  const chochoPath = path.resolve(bundleDir, 'phase_inputs', 'chocho_selected.geojson');
  const chochoGeoJson = loadGeoJSON(chochoPath);
  const chochoFeatures = toFeatureCollection(chochoGeoJson).features.filter(
    (feature) => {
      const municipalityCode = normalizeBoundaryMunicipalityCode(
        feature.properties?.municipality_code,
        feature.properties?.pref_code,
      );
      return municipalityCodes.has(municipalityCode);
    },
  );

  return {
    type: 'FeatureCollection',
    features: chochoFeatures,
  };
}

async function getKuroshiro(): Promise<Kuroshiro> {
  if (!kuroshiroInitPromise) {
    kuroshiroInitPromise = (async () => {
      const kuroshiro = new Kuroshiro();
      await kuroshiro.init(new KuromojiAnalyzer());
      return kuroshiro;
    })();
  }

  return kuroshiroInitPromise;
}

function applyMacrons(value: string): string {
  let output = value;
  for (const [source, target] of MACRON_MAP) {
    output = output.split(source).join(target);
  }
  return output;
}

function titleCaseRomaji(value: string): string {
  return value
    .split(/(\s+|-)/)
    .filter(Boolean)
    .map((token) => {
      if (/^\s+$/.test(token) || token === '-') {
        return token;
      }
      return /^[a-z]/.test(token) ? token[0].toUpperCase() + token.slice(1) : token;
    })
    .join('');
}

export async function romanizeJapaneseName(nameJa: string): Promise<string> {
  const normalizedName = cleanLabelName(nameJa);
  if (!normalizedName) {
    return '';
  }
  if (!JAPANESE_TEXT_RE.test(normalizedName)) {
    return normalizedName;
  }

  const cachedPromise = romajiCache.get(normalizedName);
  if (cachedPromise) {
    return cachedPromise;
  }

  const conversionPromise = (async () => {
    try {
      const kuroshiro = await getKuroshiro();
      const converted = await kuroshiro.convert(normalizedName, {
        to: 'romaji',
        mode: 'spaced',
        romajiSystem: 'hepburn',
      });
      const collapsed = converted.replace(/\s+/g, ' ').trim().toLowerCase();
      return titleCaseRomaji(applyMacrons(collapsed));
    } catch (error) {
      console.warn(
        `[JP] Failed to romanize name "${normalizedName}". Falling back to Japanese.`,
        error,
      );
      return normalizedName;
    }
  })();

  romajiCache.set(normalizedName, conversionPromise);
  return conversionPromise;
}

export function formatBilingualName(nameJa: string, nameEn: string): string {
  const normalizedJa = cleanLabelName(nameJa);
  const normalizedEn = cleanLabelName(nameEn);
  return normalizedEn ? `${normalizedJa}\n${normalizedEn}` : normalizedJa;
}

export function selectDominantOazaName(
  weightedNames: ReadonlyMap<string, number>,
): string {
  return Array.from(weightedNames.entries()).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    return left[0].localeCompare(right[0], 'ja');
  })[0]?.[0] ?? '';
}

function mergePolygonFeatures(
  features: readonly GeoBoundaryFeature[],
  properties: GeoJSON.GeoJsonProperties,
): GeoBoundaryFeature {
  if (features.length === 0) {
    throw new Error('[JP] Cannot merge an empty feature group.');
  }

  if (features.length === 1) {
    const cloned = turf.clone(features[0]) as GeoBoundaryFeature;
    cloned.properties = properties;
    return cloned;
  }

  const merged = turf.union(turf.featureCollection([...features]), {
    properties,
  }) as GeoBoundaryFeature | null;
  if (!merged) {
    throw new Error('[JP] Failed to dissolve grouped polygon features.');
  }
  return merged;
}

function resolveShichousonJapaneseName(
  feature: GeoBoundaryFeature,
  municipalityCode: string,
): string {
  const cityName = cleanLabelName(feature.properties?.N03_004);
  const wardName = cleanLabelName(feature.properties?.N03_005);
  if (cityName && wardName) {
    return `${cityName}${wardName}`;
  }
  return cityName || municipalityCode;
}

async function buildShichousonSourceCollection(
  context: JPBundleContext,
): Promise<{
  sourceCollection: FeatureCollection<Polygon | MultiPolygon>;
  namesById: Map<string, RegionNameParts>;
}> {
  const n03Path = path.resolve(context.sourceRoot, N03_BOUNDARY_FILE);
  assertJPSourcePathExists(n03Path, 'N03 municipality boundaries');
  const n03GeoJson = toFeatureCollection(loadGeoJSON(n03Path));

  const groupedFeatures = new Map<string, GeoBoundaryFeature[]>();
  const japaneseNames = new Map<string, string>();

  for (const feature of n03GeoJson.features) {
    const municipalityCode = normalizeMunicipalityCode(feature.properties?.N03_007);
    if (!context.municipalityCodes.has(municipalityCode)) {
      continue;
    }

    const featureGroup = groupedFeatures.get(municipalityCode);
    if (featureGroup) {
      featureGroup.push(feature);
    } else {
      groupedFeatures.set(municipalityCode, [feature]);
    }

    if (!japaneseNames.has(municipalityCode)) {
      japaneseNames.set(
        municipalityCode,
        resolveShichousonJapaneseName(feature, municipalityCode),
      );
    }
  }

  const namesById = new Map<string, RegionNameParts>();
  const sourceFeatures: GeoBoundaryFeature[] = [];

  for (const municipalityCode of Array.from(groupedFeatures.keys()).sort()) {
    const nameJa = japaneseNames.get(municipalityCode) || municipalityCode;
    const nameEn = await romanizeJapaneseName(nameJa);
    const mergedFeature = mergePolygonFeatures(
      groupedFeatures.get(municipalityCode)!,
      {
        [SOURCE_ID_PROPERTY]: municipalityCode,
        [JAPANESE_NAME_PROPERTY]: nameJa,
        [ENGLISH_NAME_PROPERTY]: nameEn,
        [BILINGUAL_NAME_PROPERTY]: formatBilingualName(nameJa, nameEn),
        [POPULATION_PROPERTY]:
          context.municipalityPopulationMap.get(municipalityCode) ?? 0,
      },
    );

    sourceFeatures.push(mergedFeature);
    namesById.set(municipalityCode, { ja: nameJa, en: nameEn });
  }

  return {
    sourceCollection: turf.featureCollection(sourceFeatures),
    namesById,
  };
}

async function extractZipEntryToTempFile(
  zipPath: string,
  matcher: (entryName: string) => boolean,
): Promise<string> {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'regions-jp-db-'),
  );

  try {
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntries().find((candidate) => matcher(candidate.entryName));
    if (!entry) {
      throw new Error(`[JP] Missing DBF entry in archive: ${zipPath}`);
    }

    const extractedPath = path.join(
      temporaryDirectory,
      path.basename(entry.entryName),
    );
    await fs.writeFile(extractedPath, entry.getData());
    return extractedPath;
  } catch (error) {
    await fs.remove(temporaryDirectory);
    throw error;
  }
}

async function loadOazaBoundaryRowsForPrefecture(
  sourceRoot: string,
  prefCode: string,
): Promise<Map<string, OazaBoundaryRow>> {
  const zipPath = path.resolve(
    sourceRoot,
    NEIGHBORHOOD_BOUNDARY_DIR,
    NEIGHBORHOOD_ZIP_TEMPLATE.replace('{prefCode}', prefCode),
  );
  assertJPSourcePathExists(zipPath, `neighborhood7 boundary zip for ${prefCode}`);

  const extractedDbfPath = await extractZipEntryToTempFile(
    zipPath,
    (entryName) => entryName.toLowerCase().endsWith('.dbf'),
  );

  try {
    const dbf = await DBFFile.open(extractedDbfPath, {
      readMode: 'loose',
      encoding: 'cp932',
    });
    const rows = await dbf.readRecords();
    const rowMap = new Map<string, OazaBoundaryRow>();

    for (const row of rows) {
      const chochoKey = normalizeChochoKey(row.KEY_CODE);
      const kcode1Base = normalizeKcode1Base(row.KCODE1);
      const sAreaBase = normalizeSAreaBase(row.S_AREA);
      const oazaName = cleanLabelName(row.S_NAME);

      if (!chochoKey || !kcode1Base || !sAreaBase || !oazaName) {
        continue;
      }
      if (kcode1Base !== sAreaBase) {
        continue;
      }
      if (rowMap.has(chochoKey)) {
        continue;
      }

      rowMap.set(chochoKey, {
        chochoKey,
        kcode1Base,
        oazaName,
      });
    }

    return rowMap;
  } finally {
    await fs.remove(path.dirname(extractedDbfPath));
  }
}

async function loadOazaBoundaryLookup(
  sourceRoot: string,
  prefCodes: readonly string[],
): Promise<Map<string, OazaBoundaryRow>> {
  const lookup = new Map<string, OazaBoundaryRow>();

  for (const prefCode of prefCodes) {
    const rows = await loadOazaBoundaryRowsForPrefecture(sourceRoot, prefCode);
    for (const [chochoKey, row] of rows) {
      if (!lookup.has(chochoKey)) {
        lookup.set(chochoKey, row);
      }
    }
  }

  return lookup;
}

async function buildOoazaSourceCollection(
  context: JPBundleContext,
): Promise<{
  sourceCollection: FeatureCollection<Polygon | MultiPolygon>;
  namesById: Map<string, RegionNameParts>;
}> {
  const oazaLookup = await loadOazaBoundaryLookup(
    context.sourceRoot,
    context.prefCodes,
  );

  const groupedFeatures = new Map<
    string,
    {
      features: GeoBoundaryFeature[];
      population: number;
      nameWeights: Map<string, number>;
    }
  >();
  const fallbackFeatures: Array<{
    feature: GeoBoundaryFeature;
    sourceId: string;
    nameJa: string;
    population: number;
  }> = [];

  const totalChochoFeatures = context.chochoSelected.features.length;
  let processedChochoFeatures = 0;

  for (const feature of context.chochoSelected.features) {
    processedChochoFeatures += 1;
    logProgressHeartbeat(
      'Ooaza grouping',
      processedChochoFeatures,
      totalChochoFeatures,
    );

    const properties = feature.properties ?? {};
    const chochoKey = normalizeChochoKey(properties.chocho_key);
    const municipalityCode = normalizeBoundaryMunicipalityCode(
      properties.municipality_code,
      properties.pref_code,
    );
    const population = resolveChochoPopulation(properties);
    const chochoName = cleanLabelName(properties.chocho_name) || chochoKey;
    const oazaRow = chochoKey ? oazaLookup.get(chochoKey) : undefined;

    if (!oazaRow || !municipalityCode) {
      fallbackFeatures.push({
        feature,
        sourceId: `chocho_${chochoKey || fallbackFeatures.length + 1}`,
        nameJa: chochoName,
        population,
      });
      continue;
    }

    const groupKey = `${municipalityCode}${oazaRow.kcode1Base}`;
    const collapsedName = collapseOazaName(oazaRow.oazaName) || oazaRow.oazaName;
    const existingGroup = groupedFeatures.get(groupKey);
    if (existingGroup) {
      existingGroup.features.push(feature);
      existingGroup.population += population;
      existingGroup.nameWeights.set(
        collapsedName,
        (existingGroup.nameWeights.get(collapsedName) || 0) + population,
      );
    } else {
      groupedFeatures.set(groupKey, {
        features: [feature],
        population,
        nameWeights: new Map([[collapsedName, population]]),
      });
    }
  }

  const namesById = new Map<string, RegionNameParts>();
  const sourceFeatures: GeoBoundaryFeature[] = [];
  const groupedEntries = Array.from(groupedFeatures.entries()).sort();
  const totalOutputFeatures = groupedEntries.length + fallbackFeatures.length;
  let builtOutputFeatures = 0;

  for (const [groupKey, group] of groupedEntries) {
    builtOutputFeatures += 1;
    logProgressHeartbeat(
      'Ooaza feature build',
      builtOutputFeatures,
      totalOutputFeatures,
    );

    const nameJa = selectDominantOazaName(group.nameWeights) || groupKey;
    const nameEn = await romanizeJapaneseName(nameJa);
    const mergedFeature = mergePolygonFeatures(group.features, {
      [SOURCE_ID_PROPERTY]: groupKey,
      [JAPANESE_NAME_PROPERTY]: nameJa,
      [ENGLISH_NAME_PROPERTY]: nameEn,
      [BILINGUAL_NAME_PROPERTY]: formatBilingualName(nameJa, nameEn),
      [POPULATION_PROPERTY]: group.population,
    });

    sourceFeatures.push(mergedFeature);
    namesById.set(groupKey, { ja: nameJa, en: nameEn });
  }

  for (const fallback of fallbackFeatures) {
    builtOutputFeatures += 1;
    logProgressHeartbeat(
      'Ooaza feature build',
      builtOutputFeatures,
      totalOutputFeatures,
    );

    const nameEn = await romanizeJapaneseName(fallback.nameJa);
    const fallbackFeature = mergePolygonFeatures([fallback.feature], {
      [SOURCE_ID_PROPERTY]: fallback.sourceId,
      [JAPANESE_NAME_PROPERTY]: fallback.nameJa,
      [ENGLISH_NAME_PROPERTY]: nameEn,
      [BILINGUAL_NAME_PROPERTY]: formatBilingualName(fallback.nameJa, nameEn),
      [POPULATION_PROPERTY]: fallback.population,
    });

    sourceFeatures.push(fallbackFeature);
    namesById.set(fallback.sourceId, { ja: fallback.nameJa, en: nameEn });
  }

  return {
    sourceCollection: turf.featureCollection(sourceFeatures),
    namesById,
  };
}

function applyJPOutputNameFields(
  features: Array<Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>>,
  namesById: ReadonlyMap<string, RegionNameParts>,
): void {
  for (const feature of features) {
    const sourceId = String(feature.properties?.ID ?? '');
    const nameParts = namesById.get(sourceId);
    if (!nameParts) {
      continue;
    }

    feature.properties = {
      ...feature.properties,
      NAME: formatBilingualName(nameParts.ja, nameParts.en),
      DISPLAY_NAME: formatBilingualName(nameParts.ja, nameParts.en),
      NAME_JA: nameParts.ja,
      NAME_EN: nameParts.en,
    };
  }
}

async function loadJPBundleContext(
  sourceRoot: string,
  bundle: JPBundleIndexRecord,
): Promise<JPBundleContext> {
  const bundleDir = path.resolve(sourceRoot, 'bundles', bundle.bundle_id);
  assertJPSourcePathExists(bundleDir, `bundle directory for ${bundle.bundle_id}`);

  const boundaryMetadata = loadBoundaryMetadata(bundleDir);
  const municipalityCodes = new Set(boundaryMetadata.municipalityCodes);
  const chochoSelected = loadChochoSelected(bundleDir, municipalityCodes);

  return {
    bundle,
    sourceRoot,
    boundaryFeature: boundaryMetadata.boundaryFeature,
    municipalityCodes,
    prefCodes: boundaryMetadata.prefCodes,
    chochoSelected,
    municipalityPopulationMap: buildMunicipalityPopulationMap(chochoSelected),
  };
}

async function buildSourceCollectionForDataset(
  context: JPBundleContext,
  datasetId: JPDatasetId,
): Promise<{
  sourceCollection: FeatureCollection<Polygon | MultiPolygon>;
  namesById: Map<string, RegionNameParts>;
}> {
  switch (datasetId) {
    case 'shichouson':
      return buildShichousonSourceCollection(context);
    case 'ooaza':
      return buildOoazaSourceCollection(context);
    default:
      throw new Error(`[JP] Unsupported dataset: ${String(datasetId)}`);
  }
}

async function extractSingleJPDataset(
  args: ExtractMapFeaturesArgs,
  context: JPBundleContext,
  datasetId: JPDatasetId,
): Promise<void> {
  const dataConfig = JP_DATA_CONFIGS[datasetId];
  const buildStartTime = Date.now();
  const { sourceCollection, namesById } = await buildSourceCollectionForDataset(
    context,
    datasetId,
  );
  console.log(
    `[JP] Built ${datasetId} source collection: ${sourceCollection.features.length} features in ${Date.now() - buildStartTime}ms`,
  );

  const postProcessStartTime = Date.now();
  const filteredRegions =
    datasetId === 'shichouson'
      ? buildRegionsWithoutClipping(sourceCollection, dataConfig)
      : filterAndClipRegionsToBoundaryGeometry(
          sourceCollection,
          context.boundaryFeature,
          dataConfig,
          {
            progressLabel: `JP ${datasetId} boundary filter`,
          },
        );
  console.log(
    `[JP] Filtered ${datasetId} regions: ${filteredRegions.length} features in ${Date.now() - postProcessStartTime}ms`,
  );

  const namingStartTime = Date.now();
  applyJPOutputNameFields(filteredRegions, namesById);
  console.log(
    `[JP] Applied ${datasetId} output labels in ${Date.now() - namingStartTime}ms`,
  );

  if (args.preview) {
    renderFeaturePreview(filteredRegions, args.previewCount!);
    return;
  }

  const saveStartTime = Date.now();
  saveBoundaries(
    {
      ...args,
      dataType: datasetId,
    },
    filteredRegions,
    dataConfig,
  );
  console.log(
    `[JP] Saved ${datasetId} dataset in ${Date.now() - saveStartTime}ms`,
  );
}

export async function extractJPBoundaries(
  args: ExtractMapFeaturesArgs,
): Promise<void> {
  const bundleId = cleanLabelName(args.bundle);
  if (!bundleId) {
    throw new Error('[JP] Missing required --bundle argument.');
  }

  const sourceRoot = resolveJPSourceDataRoot();
  assertJPSourcePathExists(sourceRoot, 'JP source data root');

  const bundle = resolveJPBundleRecord(sourceRoot, bundleId);
  const context = await loadJPBundleContext(sourceRoot, bundle);
  const datasetIds =
    args.dataType === 'all' ? JP_DATASET_ORDER : [args.dataType as JPDatasetId];

  for (const datasetId of datasetIds) {
    if (!(datasetId in JP_DATA_CONFIGS)) {
      throw new Error(`Unsupported data type for JP: ${datasetId}`);
    }

    await extractSingleJPDataset(args, context, datasetId as JPDatasetId);
  }
}
