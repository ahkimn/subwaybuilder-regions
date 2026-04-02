import * as turf from '@turf/turf';
import { cleanCoords } from '@turf/clean-coords';
import AdmZip from 'adm-zip';
import { DBFFile } from 'dbffile';
import fs from 'fs-extra';
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from 'geojson';
import os from 'os';
import path from 'path';

import { loadGeoJSON } from '../../utils/files';
import { logProgressHeartbeat } from '../../utils/progress';
import {
  BILINGUAL_NAME_PROPERTY,
  ENGLISH_NAME_PROPERTY,
  JAPANESE_NAME_PROPERTY,
  N03_BOUNDARY_FILE,
  NEIGHBORHOOD_BOUNDARY_DIR,
  NEIGHBORHOOD_ZIP_TEMPLATE,
  POPULATION_PROPERTY,
  SOURCE_ID_PROPERTY,
} from './constants';
import {
  assertJPSourcePathExists,
  normalizeBoundaryMunicipalityCode,
  normalizeChochoKey,
  normalizeKcode1Base,
  normalizeMunicipalityCode,
  normalizeSAreaBase,
  resolveChochoPopulation,
  toFeatureCollection,
} from './context';
import {
  cleanLabelName,
  deriveOoazaName,
  formatBilingualName,
  resolveShichousonJapaneseName,
  romanizeJapaneseName,
  selectDominantOazaName,
} from './names';
import type {
  GeoBoundaryFeature,
  JPBundleContext,
  OazaBoundaryRow,
  RegionNameParts,
} from './types';

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

  const featureCollection = turf.featureCollection([...features]);
  let merged: GeoBoundaryFeature | null = null;

  try {
    merged = turf.union(featureCollection, {
      properties,
    }) as GeoBoundaryFeature | null;
  } catch (error) {
    const sourceId = String(properties?.[SOURCE_ID_PROPERTY] ?? 'unknown');
    console.warn(
      `[JP] Union failed for ${sourceId}; retrying with cleaned/truncated coordinates.`,
      error,
    );

    // Some JP groups trigger polyclip numerical robustness issues during union even
    // though the grouped polygons are otherwise valid. Retrying with cleaned geometry
    // and slightly reduced coordinate precision has proven sufficient for cases such
    // as tsugaru/022050460 without materially changing the output shape.
    const normalizedFeatures = features.map((feature) =>
      turf.truncate(cleanCoords(feature), {
        precision: 7,
        coordinates: 2,
        mutate: false,
      }),
    ) as GeoBoundaryFeature[];

    merged = turf.union(turf.featureCollection(normalizedFeatures), {
      properties,
    }) as GeoBoundaryFeature | null;
  }

  if (!merged) {
    throw new Error('[JP] Failed to dissolve grouped polygon features.');
  }
  return merged;
}

export async function buildShichousonSourceCollection(
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
    const municipalityCode = normalizeMunicipalityCode(
      feature.properties?.N03_007,
    );
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

// Small utility to extract a single entry from a zip archive to a temporary file, which is necessary since the JP data repository contains some archived data files
async function extractZipEntryToTempFile(
  zipPath: string,
  matcher: (entryName: string) => boolean,
): Promise<string> {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'regions-jp-db-'),
  );

  try {
    const zip = new AdmZip(zipPath);
    const entry = zip
      .getEntries()
      .find((candidate) => matcher(candidate.entryName));
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

// Loads and builds a lookup of 大字 boundaries for the specified prefecture codes, which are used for building the ooaza source collection. 
async function loadOazaBoundaryRowsForPrefecture(
  sourceRoot: string,
  prefCode: string,
): Promise<Map<string, OazaBoundaryRow>> {
  const zipPath = path.resolve(
    sourceRoot,
    NEIGHBORHOOD_BOUNDARY_DIR,
    NEIGHBORHOOD_ZIP_TEMPLATE.replace('{prefCode}', prefCode),
  );
  assertJPSourcePathExists(
    zipPath,
    `neighborhood7 boundary zip for ${prefCode}`,
  );

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
      // KEY_CODE is the finest-grained join key in the neighborhood boundary DBF.
      // It matches the chocho-level code from phase_inputs/chocho_selected.geojson.
      const chochoKey = normalizeChochoKey(row.KEY_CODE);

      // KCODE1 carries the ooaza-level parent code corresponding to the KEY_CODE
      // hierarchy. We keep it so we can validate the first 9 digits of KEY_CODE
      // against the DBF's explicit ooaza code instead of trusting either field alone.
      const kcode1Base = normalizeKcode1Base(row.KCODE1);

      // S_AREA is a second area-code field carried by the DBF. We normalize it to the same 4-digit base and require it to match KCODE1 so we only keep rows where the parent-area code and the area label are aligned at the same ooaza-level unit.
      // This filters out rows that point at a more specific sub-area variant.
      const sAreaBase = normalizeSAreaBase(row.S_AREA);
      const oazaName = cleanLabelName(row.S_NAME);

      // Some neighborhood7 rows have a valid KEY_CODE/KCODE1/S_AREA mapping but a blank
      // S_NAME. We still keep those rows so the chocho can be grouped correctly, and we
      // fall back to chocho_name (or ultimately the group key) later when choosing labels.
      if (!chochoKey || !kcode1Base || !sAreaBase) {
        continue;
      }
      // Keep only rows whose grouping code and area code agree on the same base ooaza.
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

// Main source collection builders for each dataset. Each function takes the full JP bundle context as input and returns the raw source collection and a mapping of source IDs to Japanese/English name parts that can be used for labeling and post-processing. 
export async function buildOoazaSourceCollection(
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

  const totalChochoFeatures = context.chochoSelected.features.length;
  let processedChochoFeatures = 0;

  for (const feature of context.chochoSelected.features) {
    processedChochoFeatures += 1;
    logProgressHeartbeat(
      '[JP]',
      'Ooaza grouping',
      processedChochoFeatures,
      totalChochoFeatures,
    );

    const properties = feature.properties ?? {};
    const chochoKey = normalizeChochoKey(properties.chocho_key);
    const municipalityCode = normalizeBoundaryMunicipalityCode(
      properties.municipality_code,
    );
    const chochoName = cleanLabelName(properties.chocho_name);
    const population = resolveChochoPopulation(properties);
    const oazaRow = chochoKey ? oazaLookup.get(chochoKey) : undefined;

    if (!municipalityCode) {
      throw new Error(
        '[JP] chocho_selected feature is missing a municipality code.',
      );
    }
    if (!chochoKey) {
      throw new Error('[JP] chocho_selected feature is missing chocho_key.');
    }
    if (!oazaRow) {
      throw new Error(
        `[JP] Missing neighborhood7 boundary mapping for chocho_key ${chochoKey}.`,
      );
    }

    // Census KEY_CODE already encodes the ooaza hierarchy as
    // PREF(2) + CITY(3) + OAZA(4) + AZA(remaining digits), so dissolving on the
    // first 9 digits gives the canonical ooaza region id directly.
    const groupKey = chochoKey.slice(0, 9);
    const expectedGroupKey = `${municipalityCode}${oazaRow.kcode1Base}`;
    if (groupKey !== expectedGroupKey) {
      throw new Error(
        `[JP] KEY_CODE/KCODE1 mismatch for chocho_key ${chochoKey}: ${groupKey} !== ${expectedGroupKey}.`,
      );
    }
    const resolvedName =
      deriveOoazaName(oazaRow.oazaName) ||
      oazaRow.oazaName ||
      deriveOoazaName(chochoName) ||
      chochoName ||
      groupKey;
    const existingGroup = groupedFeatures.get(groupKey);
    if (existingGroup) {
      existingGroup.features.push(feature);
      existingGroup.population += population;
      existingGroup.nameWeights.set(
        resolvedName,
        (existingGroup.nameWeights.get(resolvedName) || 0) + population,
      );
    } else {
      groupedFeatures.set(groupKey, {
        features: [feature],
        population,
        nameWeights: new Map([[resolvedName, population]]),
      });
    }
  }

  const namesById = new Map<string, RegionNameParts>();
  const sourceFeatures: GeoBoundaryFeature[] = [];
  const groupedEntries = Array.from(groupedFeatures.entries()).sort();
  const totalOutputFeatures = groupedEntries.length;
  let builtOutputFeatures = 0;

  for (const [groupKey, group] of groupedEntries) {
    builtOutputFeatures += 1;
    logProgressHeartbeat(
      '[JP]',
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

  return {
    sourceCollection: turf.featureCollection(sourceFeatures),
    namesById,
  };
}

export function applyJPOutputNameFields(
  features: Array<Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>>,
  namesById: ReadonlyMap<string, RegionNameParts>,
): void {
  for (const feature of features) {
    const sourceId = String(feature.properties?.ID ?? '');
    const nameParts = namesById.get(sourceId);
    if (!nameParts) {
      throw new Error(
        `[JP] Missing output name parts for region ID ${sourceId}.`,
      );
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
