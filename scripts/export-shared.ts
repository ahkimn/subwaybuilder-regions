import fs from 'fs-extra';
import path from 'path';

import {
  CITY_BOUNDARIES_FILE,
  DATA_DIR,
  DATA_INDEX_FILE,
  SOURCE_DATA_DIR,
} from '../mods/regions/constants';
import type { DatasetIndex } from '../mods/regions/dataset-index';
import { COUNTRY_DATASET_ORDER } from '../mods/regions/datasets/catalog';
import { loadBoundariesFromCSV } from './utils/files';

// Inverse of COUNTRY_DATASET_ORDER: dataset id -> country code. Lets us resolve a
// city's country from the datasets recorded in the index.
export const DATASET_COUNTRY: ReadonlyMap<string, string> = new Map(
  Object.entries(COUNTRY_DATASET_ORDER).flatMap(([country, datasetIds]) =>
    datasetIds.map((datasetId) => [datasetId, country] as const),
  ),
);

export function loadDatasetIndex(): DatasetIndex {
  const indexPath = path.resolve(DATA_DIR, DATA_INDEX_FILE);
  if (!fs.existsSync(indexPath)) {
    return {};
  }
  try {
    return (fs.readJsonSync(indexPath, { throws: false }) ??
      {}) as DatasetIndex;
  } catch (error) {
    console.warn(
      `[Export] Failed to read ${DATA_INDEX_FILE}; treating as empty.`,
      error,
    );
    return {};
  }
}

// Country code for a city, resolved from its indexed datasets. null when the city
// has no recognised dataset.
export function resolveCityCountry(
  cityCode: string,
  datasetIndex: DatasetIndex,
): string | null {
  for (const entry of datasetIndex[cityCode] ?? []) {
    const country = DATASET_COUNTRY.get(entry.datasetId);
    if (country) return country;
  }
  return null;
}

// datasetIds whose source is OSM-derived. These are fetched at runtime, so they are
// excluded from shipped bundles by default.
export function resolveOsmDatasetIdsForCity(
  cityCode: string,
  datasetIndex: DatasetIndex,
): string[] {
  return (datasetIndex[cityCode] ?? [])
    .filter((entry) => entry.source.toUpperCase().includes('OSM'))
    .map((entry) => entry.datasetId);
}

// Every city code present in boundaries.csv (used by --all).
export function resolveAllCityCodes(): string[] {
  const boundariesPath = path.resolve(SOURCE_DATA_DIR, CITY_BOUNDARIES_FILE);
  const boundaries = loadBoundariesFromCSV(boundariesPath);
  return Array.from(boundaries.keys()).map((code) => code.toUpperCase());
}
