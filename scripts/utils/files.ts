import { parse } from 'csv-parse/sync';
import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
import { parse as parseYaml } from 'yaml';
import { createGunzip, gunzipSync, gzipSync } from 'zlib';

import { DATA_INDEX_FILE } from '../../shared/constants';
import type { DatasetIndex, DatasetMetadata } from '../../shared/dataset-index';
import {
  COUNTRY_DATASET_ORDER,
  resolveCountryDatasetOrder,
} from '../../shared/datasets/catalog';
import type { BoundaryBox } from './geometry';
import { findOsmCountryConfig } from './osm-country-config';

export type Row = Record<string, string>;

const KNOWN_DATASET_ORDERS = Object.values(COUNTRY_DATASET_ORDER);

function resolveDatasetOrder(country: string): readonly string[] {
  const orderedCatalogDatasets = resolveCountryDatasetOrder(country);
  if (orderedCatalogDatasets.length > 0) {
    return orderedCatalogDatasets;
  }

  const osmCountryConfig = findOsmCountryConfig(country);
  if (!osmCountryConfig) {
    return [];
  }

  return osmCountryConfig.availableBoundaryTypes.map(
    (entry) => entry.datasetId,
  );
}

function resolvePreferredDatasetOrderForCity(
  entries: DatasetMetadata[],
  fallbackCountryCode?: string,
): readonly string[] {
  const datasetIds = new Set(entries.map((entry) => entry.datasetId));
  const matchingDatasetOrders = KNOWN_DATASET_ORDERS.filter((datasetOrder) =>
    datasetOrder.some((datasetId) => datasetIds.has(datasetId)),
  );

  if (matchingDatasetOrders.length === 1) {
    return matchingDatasetOrders[0];
  }

  if (fallbackCountryCode) {
    return resolveDatasetOrder(fallbackCountryCode);
  }

  return [];
}

function buildDatasetOrderIndex(
  preferredDatasetOrder: readonly string[],
): Map<string, number> {
  return new Map<string, number>(
    preferredDatasetOrder.map((datasetId, orderIndex) => [
      datasetId,
      orderIndex,
    ]),
  );
}

function sortDatasetEntriesByDatasetOrder(
  entries: DatasetMetadata[],
  datasetOrderIndex: ReadonlyMap<string, number>,
): DatasetMetadata[] {
  if (datasetOrderIndex.size === 0) {
    return entries;
  }

  return [...entries].sort((a, b) => {
    const aOrder = datasetOrderIndex.get(a.datasetId);
    const bOrder = datasetOrderIndex.get(b.datasetId);

    if (aOrder != null && bOrder != null) {
      return aOrder - bOrder;
    }

    if (aOrder != null) {
      return -1;
    }

    if (bOrder != null) {
      return 1;
    }

    return a.datasetId.localeCompare(b.datasetId);
  });
}

// --- File Operations --- //

export function validateFilePath(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    console.error(`Input file does not exist: ${filePath}`);
    process.exit(1);
  }
}

export function loadYAML<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    console.error(`YAML config not found: ${filePath}`);
    process.exit(1);
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return (parseYaml(raw) ?? {}) as T;
  } catch (err: any) {
    console.error(
      `Failed to load or parse YAML file: ${filePath} with error: ${err.message}`,
    );
    process.exit(1);
  }
}

export function loadGeoJSON(filePath: string): GeoJSON.FeatureCollection {
  validateFilePath(filePath);
  let geoJson: GeoJSON.FeatureCollection;
  try {
    const loadedJson = filePath.endsWith('.gz')
      ? JSON.parse(gunzipSync(fs.readFileSync(filePath)).toString('utf8'))
      : fs.readJsonSync(filePath);
    geoJson = loadedJson as GeoJSON.FeatureCollection;
  } catch (err: any) {
    console.error(
      `Failed to load or parse GeoJSON file: ${filePath} with error: ${err.message}`,
    );
    process.exit(1);
  }

  return geoJson;
}

export async function loadGeoJSONFromNDJSON(
  filePath: string,
): Promise<GeoJSON.FeatureCollection> {
  validateFilePath(filePath);

  const features: GeoJSON.Feature[] = new Array<GeoJSON.Feature>();
  await loadFeatureFromNDJSON(filePath, (f) => features.push(f));

  return {
    type: 'FeatureCollection',
    features: features,
  };
}

async function loadFeatureFromNDJSON(
  filePath: string,
  onFeature: (f: GeoJSON.Feature) => void,
): Promise<void> {
  const inputStream = filePath.endsWith('.gz')
    ? fs.createReadStream(filePath).pipe(createGunzip())
    : fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    onFeature(JSON.parse(line) as GeoJSON.Feature);
  }
}

export function saveGeoJSON(
  filePath: string,
  featureCollection: GeoJSON.FeatureCollection,
  options?: { compress?: boolean },
): void {
  try {
    const compressOutput = options?.compress ?? false;
    const resolvedFilePath =
      compressOutput && !filePath.endsWith('.gz') ? `${filePath}.gz` : filePath;

    console.info(`Saving GeoJSON to: ${resolvedFilePath}`);
    const saveDirectory = path.dirname(filePath);
    const temporaryFilePath = `${resolvedFilePath}.tmp`;

    // Ensure directory exists
    fs.ensureDirSync(saveDirectory);
    if (compressOutput) {
      const serializedGeoJSON = JSON.stringify(featureCollection, null, 2);
      fs.writeFileSync(temporaryFilePath, gzipSync(serializedGeoJSON));
    } else {
      fs.writeJsonSync(temporaryFilePath, featureCollection, { spaces: 2 });
    }
    fs.moveSync(temporaryFilePath, resolvedFilePath, { overwrite: true });

    console.info(`Saved GeoJSON to: ${resolvedFilePath}`);
  } catch (err) {
    console.error(`Failed to save GeoJSON to: ${filePath} with error: ${err}`);
    process.exit(1);
  }
}

export function loadCSV(filePath: string): Array<Row> {
  validateFilePath(filePath);
  const csvContent: string = fs.readFileSync(filePath, 'utf8');
  const records: Row[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records;
}

export function loadBoundariesFromCSV(
  inputPath: string,
): Map<string, BoundaryBox> {
  const boundaries = new Map<string, BoundaryBox>();
  const rows = loadCSV(inputPath);

  for (const row of rows) {
    const code = row['Code'];
    const south = parseFloat(row['South']);
    const west = parseFloat(row['West']);
    const north = parseFloat(row['North']);
    const east = parseFloat(row['East']);

    if (
      code &&
      !isNaN(south) &&
      !isNaN(west) &&
      !isNaN(north) &&
      !isNaN(east)
    ) {
      boundaries.set(code, { south, west, north, east });
    }
  }
  console.log(`Loaded ${boundaries.size} city boundaries from CSV.`);
  return boundaries;
}

export function buildCSVIndex(
  rows: Row[],
  keyColumn: string,
  valueColumn: string,
): Map<string, string> {
  const index = new Map<string, string>();

  for (const row of rows) {
    const key = row[keyColumn];
    const value = row[valueColumn];
    if (key && value) {
      index.set(key, value);
    }
  }
  return index;
}

export function updateIndexJson(
  indexPath: string,
  cityCode: string,
  datasetEntry: DatasetMetadata,
  countryCode: string,
): void {
  if (!fs.existsSync(indexPath)) {
    const indexDirectory = path.dirname(indexPath);
    fs.ensureDirSync(indexDirectory);
    fs.writeJsonSync(indexPath, {}, { spaces: 2 });
    console.log(`Created missing index file: ${indexPath}`);
  }

  const index = (fs.readJsonSync(indexPath, { throws: false }) ||
    {}) as DatasetIndex;

  if (!index[cityCode]) {
    index[cityCode] = [];
  }

  const existingEntry = index[cityCode].find(
    (entry) => entry.datasetId === datasetEntry.datasetId,
  );
  if (existingEntry) {
    Object.assign(existingEntry, datasetEntry);
    console.log(
      `Updated ${DATA_INDEX_FILE} for ${cityCode} with dataset: ${datasetEntry.displayName}`,
    );
  } else {
    index[cityCode].push(datasetEntry);
    console.log(
      `Added ${DATA_INDEX_FILE} entry for ${cityCode}: ${datasetEntry.displayName}`,
    );
  }

  const sortedCityCodes = Object.keys(index).sort((a, b) => a.localeCompare(b));
  const sortedIndex = Object.fromEntries(
    sortedCityCodes.map((sortedCityCode) => {
      const cityEntries = index[sortedCityCode] || [];
      const preferredDatasetOrderForCity = resolvePreferredDatasetOrderForCity(
        cityEntries,
        sortedCityCode === cityCode ? countryCode : undefined,
      );
      const datasetOrderIndex = buildDatasetOrderIndex(
        preferredDatasetOrderForCity,
      );
      return [
        sortedCityCode,
        sortDatasetEntriesByDatasetOrder(cityEntries, datasetOrderIndex),
      ];
    }),
  ) as DatasetIndex;

  fs.writeJsonSync(indexPath, sortedIndex, { spaces: 2 });
}
