#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

import {
  CITY_BOUNDARIES_FILE,
  DATA_DIR,
  DATA_INDEX_FILE,
  SOURCE_DATA_DIR,
} from '../shared/constants';
import type { DatasetIndex } from '../shared/dataset-index';
import { parseExportArgs } from './utils/cli';
import { loadBoundariesFromCSV } from './utils/files';

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

  fs.ensureDirSync(outputDir);
  const archivePath = path.resolve(outputDir, `${cityCode}.gz`);
  if (fs.existsSync(archivePath)) {
    fs.removeSync(archivePath);
  }

  const tarArgs = ['-czf', archivePath, '-C', DATA_DIR, cityCode];
  // Conditionally exclude OSM-derived boundary data based on input arguments
  if (!includeOSMData) {
    const osmDatasetIds = resolveOsmDatasetIdsForCity(cityCode, datasetIndex);
    for (const datasetId of osmDatasetIds) {
      tarArgs.unshift(
        '--exclude',
        `${cityCode}/${datasetId}.geojson`,
        '--exclude',
        `${cityCode}/${datasetId}.geojson.gz`,
      );
    }
  }

  const tarResult = spawnSync('tar', tarArgs, {
    stdio: 'inherit',
    shell: false,
  });

  if (tarResult.error) {
    return { ok: false, reason: tarResult.error.message };
  }
  if (tarResult.status !== 0) {
    return { ok: false, reason: `tar_exit_${tarResult.status}` };
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
