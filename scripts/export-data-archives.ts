#!/usr/bin/env node
import AdmZip from 'adm-zip';
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
import { parseExportArgs } from './utils/cli';
import { loadBoundariesFromCSV } from './utils/files';

// Inverse of COUNTRY_DATASET_ORDER: dataset id -> country code. Lets us group a
// city's archive under its country from the datasets recorded in the index.
const DATASET_COUNTRY: ReadonlyMap<string, string> = new Map(
  Object.entries(COUNTRY_DATASET_ORDER).flatMap(([country, datasetIds]) =>
    datasetIds.map((datasetId) => [datasetId, country] as const),
  ),
);

// Country code (lowercased, used as the archive subfolder) for a city, resolved
// from its indexed datasets. null when the city has no recognised dataset.
function resolveCityCountry(
  cityCode: string,
  datasetIndex: DatasetIndex,
): string | null {
  for (const entry of datasetIndex[cityCode] ?? []) {
    const country = DATASET_COUNTRY.get(entry.datasetId);
    if (country) return country.toLowerCase();
  }
  return null;
}

function resolveCityCodes(args: ReturnType<typeof parseExportArgs>): string[] {
  if (!args.all) {
    return args.cityCodes;
  }

  const boundariesPath = path.resolve(SOURCE_DATA_DIR, CITY_BOUNDARIES_FILE);
  const boundaries = loadBoundariesFromCSV(boundariesPath);
  return Array.from(boundaries.keys()).map((code) => code.toUpperCase());
}

function loadDatasetIndex(): DatasetIndex {
  const indexPath = path.resolve(DATA_DIR, DATA_INDEX_FILE);
  if (!fs.existsSync(indexPath)) {
    return {};
  }

  try {
    return (fs.readJsonSync(indexPath, { throws: false }) ??
      {}) as DatasetIndex;
  } catch (error) {
    console.warn(
      `[Export] Failed to read ${DATA_INDEX_FILE}; defaulting to no source-based exclusions.`,
      error,
    );
    return {};
  }
}

// Helper function to check if a local dataset is derived from OSM data. By default the extraction scripts will use "OSM" as the source name for any OSM-derived boundary data
function resolveOsmDatasetIdsForCity(
  cityCode: string,
  datasetIndex: DatasetIndex,
): string[] {
  const entries = datasetIndex[cityCode] ?? [];
  return entries
    .filter((entry) => entry.source.toUpperCase().includes('OSM'))
    .map((entry) => entry.datasetId);
}

function createArchiveForCity(
  cityCode: string,
  outputDir: string,
  includeOSMData: boolean,
  datasetIndex: DatasetIndex,
): { ok: boolean; reason?: string } {
  const cityDataDir = path.resolve(DATA_DIR, cityCode);
  if (!fs.existsSync(cityDataDir) || !fs.statSync(cityDataDir).isDirectory()) {
    return { ok: false, reason: 'missing_data_directory' };
  }

  // Group each archive under its country (export/<cc>/<CITY>.zip); cities with
  // no recognised dataset fall back to the flat output root.
  const country = resolveCityCountry(cityCode, datasetIndex);
  const targetDir = country ? path.resolve(outputDir, country) : outputDir;
  fs.ensureDirSync(targetDir);
  const archivePath = path.resolve(targetDir, `${cityCode}.zip`);
  if (fs.existsSync(archivePath)) {
    fs.removeSync(archivePath);
  }

  // OSM-derived datasets are fetched at runtime, so they are excluded from the
  // shipped bundle by default (keyed by `<datasetId>.geojson[.gz]`).
  const excludedNames = new Set<string>();
  if (!includeOSMData) {
    for (const datasetId of resolveOsmDatasetIdsForCity(cityCode, datasetIndex)) {
      excludedNames.add(`${datasetId}.geojson`);
      excludedNames.add(`${datasetId}.geojson.gz`);
    }
  }

  // Emit a real ZIP (not tar.gz) so Windows recognises and extracts it natively.
  // Datasets are nested under a `<CITY>/` folder, matching the layout consumers
  // unzip into `mods/regions/data/`.
  try {
    const zip = new AdmZip();
    // City data directories are flat (dataset files only); add each file under
    // the `<CITY>/` prefix.
    for (const entry of fs.readdirSync(cityDataDir)) {
      if (excludedNames.has(entry)) continue;
      const entryPath = path.join(cityDataDir, entry);
      if (fs.statSync(entryPath).isFile()) {
        zip.addLocalFile(entryPath, cityCode);
      }
    }
    zip.writeZip(archivePath);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'zip_write_failed',
    };
  }

  return { ok: true };
}

function main(): void {
  const args = parseExportArgs();
  const outputDir = path.resolve(args.outputDir);
  // This script assumes exportable cities are present in the boundaries.csv file; if a city has previously been generated with the extraction scripts but is no longer within the boundaries.csv file, it will be skipped during this export
  const cityCodes = resolveCityCodes(args);
  // Rely on the dataset index to identify the source of each dataset and selectively exclude OSM-derived boundary data if needed
  const datasetIndex = loadDatasetIndex();

  if (cityCodes.length === 0) {
    console.error('[Export] No city codes found to export.');
    process.exit(1);
  }

  const failures: Array<{ cityCode: string; reason: string }> = [];
  const successes: string[] = [];

  for (const cityCode of cityCodes) {
    console.log(`[Export] Archiving ${cityCode}...`);
    const result = createArchiveForCity(
      cityCode,
      outputDir,
      args.includeOSMData,
      datasetIndex,
    );

    if (!result.ok) {
      failures.push({
        cityCode,
        reason: result.reason ?? 'unknown_error',
      });
      continue;
    }
    successes.push(cityCode);
  }

  console.log(
    `[Export] Completed. Success: ${successes.length}, Failed: ${failures.length}`,
  );

  if (failures.length > 0) {
    failures.forEach((failure) => {
      console.error(`[Export] Failed ${failure.cityCode}: ${failure.reason}`);
    });
    process.exit(1);
  }
}

main();
