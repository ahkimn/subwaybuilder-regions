import { spawnSync } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import { loadGeoJSON, saveGeoJSON } from '../utils/files';
import { stripGeoJsonExtension } from './datasets';

export type RegionDatasetFile = {
  datasetId: string;
  fileName: string;
  filePath: string;
  compressed: boolean;
};

export type LoadedRegionInput = {
  inputPath: string;
  cityCode: string;
  cityDir: string;
  temporaryRoot?: string;
  cleanup(): void;
};

export function isGeoJsonDatasetPath(filePath: string): boolean {
  return /\.geojson(?:\.gz)?$/i.test(filePath);
}

export function listDatasetFiles(cityDir: string): RegionDatasetFile[] {
  return fs
    .readdirSync(cityDir)
    .filter((fileName) => isGeoJsonDatasetPath(fileName))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => ({
      datasetId: stripGeoJsonExtension(fileName),
      fileName,
      filePath: path.join(cityDir, fileName),
      compressed: fileName.toLowerCase().endsWith('.gz'),
    }));
}

export function loadFeatureCollection(
  filePath: string,
): GeoJSON.FeatureCollection {
  return loadGeoJSON(filePath);
}

export function saveFeatureCollection(
  filePath: string,
  featureCollection: GeoJSON.FeatureCollection,
  options?: { compress?: boolean },
): { resolvedFilePath: string; fileSizeMB?: number } {
  return saveGeoJSON(filePath, featureCollection, options);
}

export function copyCitySupportFiles(
  sourceDir: string,
  targetDir: string,
): void {
  for (const fileName of [
    'data_index.json',
    'validation_report.json',
    'validation_report.md',
  ]) {
    const sourcePath = path.join(sourceDir, fileName);
    if (!fs.existsSync(sourcePath)) {
      continue;
    }
    fs.ensureDirSync(targetDir);
    fs.copyFileSync(sourcePath, path.join(targetDir, fileName));
  }
}

export function loadRegionInput(inputPath: string): LoadedRegionInput {
  const resolvedInputPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(`[RegionsData] Input path does not exist: ${inputPath}`);
  }

  const inputStat = fs.statSync(resolvedInputPath);
  if (inputStat.isDirectory()) {
    return {
      inputPath: resolvedInputPath,
      cityCode: path.basename(resolvedInputPath).toUpperCase(),
      cityDir: resolvedInputPath,
      cleanup() {},
    };
  }

  if (!resolvedInputPath.toLowerCase().endsWith('.gz')) {
    throw new Error(
      `[RegionsData] Expected a city directory or tar.gz archive: ${inputPath}`,
    );
  }

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'regions-data-'));
  extractArchive(resolvedInputPath, temporaryRoot);
  const cityDir = resolveExtractedCityDirectory(temporaryRoot, inputPath);

  return {
    inputPath: resolvedInputPath,
    cityCode: path.basename(cityDir).toUpperCase(),
    cityDir,
    temporaryRoot,
    cleanup() {
      fs.removeSync(temporaryRoot);
    },
  };
}

function supportsTarForceLocal(): boolean {
  const helpResult = spawnSync('tar', ['--help'], {
    encoding: 'utf8',
    shell: false,
  });

  if (helpResult.error || helpResult.status !== 0) {
    return false;
  }

  const helpText = `${helpResult.stdout ?? ''}\n${helpResult.stderr ?? ''}`;
  return helpText.includes('--force-local');
}

function extractArchive(archivePath: string, outputDir: string): void {
  const tarArgs = ['-xzf', archivePath, '-C', outputDir];
  if (supportsTarForceLocal()) {
    tarArgs.unshift('--force-local');
  }

  const tarResult = spawnSync('tar', tarArgs, {
    encoding: 'utf8',
    shell: false,
  });

  if (tarResult.error) {
    throw new Error(
      `[RegionsData] Failed to extract ${archivePath}: ${tarResult.error.message}`,
    );
  }
  if (tarResult.status !== 0) {
    throw new Error(
      `[RegionsData] Failed to extract ${archivePath}: ${tarResult.stderr}`,
    );
  }
}

function resolveExtractedCityDirectory(
  extractionRoot: string,
  originalInputPath: string,
): string {
  const childDirectories = fs
    .readdirSync(extractionRoot)
    .map((entry) => path.join(extractionRoot, entry))
    .filter((entryPath) => fs.statSync(entryPath).isDirectory());

  if (childDirectories.length === 1) {
    return childDirectories[0];
  }

  const rootDatasetFiles = listDatasetFiles(extractionRoot);
  if (rootDatasetFiles.length > 0) {
    return extractionRoot;
  }

  throw new Error(
    `[RegionsData] Could not resolve extracted city directory for ${originalInputPath}`,
  );
}
