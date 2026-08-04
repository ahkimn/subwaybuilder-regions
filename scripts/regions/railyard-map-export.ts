import {
  REGIONS_MANIFEST_SCHEMA_VERSION,
  type RegionsDatasetEntry,
  type RegionsManifest,
  validateRegionsFeatureCollection,
  validateRegionsManifest,
} from '@subway-builder-modded/regions-schemas';
import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';

import { DATA_DIR } from '../../mods/regions/constants';
import type {
  DatasetIndex,
  DatasetMetadata,
} from '../../mods/regions/dataset-index';
import {
  resolveCityCountry,
  resolveOsmDatasetIdsForCity,
} from '../export-shared';

// Subfolder written under each city's export dir. jp-data's prepare_releases folds
// `export/<CITY>/regions/*` into the packaged map's `.railyard_map/regions/*`.
export const REGIONS_EXPORT_SUBDIR = 'regions';
const DATASET_EXTENSIONS = ['.geojson.gz', '.geojson'] as const;

export type EmitCityOptions = {
  dataDir?: string;
  outDir: string;
  includeOSMData?: boolean;
  validateFeatures?: boolean;
  dryRun?: boolean;
};

export type ShippableDataset = {
  metadata: DatasetMetadata;
  sourcePath: string;
  file: string;
};

// The datasets a city ships in .railyard_map (OSM-derived ones are runtime-fetched,
// so excluded by default), each paired with the on-disk file that backs it.
export function resolveShippableDatasets(
  cityCode: string,
  datasetIndex: DatasetIndex,
  includeOSMData: boolean,
  dataDir: string = DATA_DIR,
): ShippableDataset[] {
  const cityDataDir = path.resolve(dataDir, cityCode);
  const excluded = new Set(
    includeOSMData ? [] : resolveOsmDatasetIdsForCity(cityCode, datasetIndex),
  );

  const result: ShippableDataset[] = [];
  for (const metadata of datasetIndex[cityCode] ?? []) {
    if (excluded.has(metadata.datasetId)) continue;
    const match = DATASET_EXTENSIONS.map((ext) => ({
      file: `${metadata.datasetId}${ext}`,
      sourcePath: path.join(cityDataDir, `${metadata.datasetId}${ext}`),
    })).find((candidate) => fs.existsSync(candidate.sourcePath));
    if (!match) continue; // dataset indexed but no file on disk — skip
    result.push({ metadata, sourcePath: match.sourcePath, file: match.file });
  }
  return result;
}

export function buildManifest(
  cityCode: string,
  datasetIndex: DatasetIndex,
  datasets: ShippableDataset[],
): RegionsManifest {
  const country = resolveCityCountry(cityCode, datasetIndex) ?? undefined;
  const entries: RegionsDatasetEntry[] = datasets.map(({ metadata, file }) => ({
    datasetId: metadata.datasetId,
    displayName: metadata.displayName,
    unitSingular: metadata.unitSingular,
    unitPlural: metadata.unitPlural,
    source: metadata.source,
    file,
    size: metadata.size,
    ...(metadata.fileSizeMB != null ? { fileSizeMB: metadata.fileSizeMB } : {}),
  }));
  return {
    schemaVersion: REGIONS_MANIFEST_SCHEMA_VERSION,
    cityCode,
    ...(country ? { country } : {}),
    datasets: entries,
  };
}

function readFeatureCollection(sourcePath: string): unknown {
  const raw = fs.readFileSync(sourcePath);
  const text = sourcePath.endsWith('.gz')
    ? zlib.gunzipSync(raw).toString('utf8')
    : raw.toString('utf8');
  return JSON.parse(text);
}

// Remove dataset files no longer in the manifest, without recursive directory
// deletion (targeted removes only — no rmtree/junction traversal).
function pruneStaleDatasets(regionsDir: string, keepFiles: Set<string>): void {
  if (!fs.existsSync(regionsDir)) return;
  for (const entry of fs.readdirSync(regionsDir)) {
    const isDataset = DATASET_EXTENSIONS.some((ext) => entry.endsWith(ext));
    if (isDataset && !keepFiles.has(entry)) {
      fs.removeSync(path.join(regionsDir, entry));
    }
  }
}

export type EmitResult = { ok: boolean; reason?: string };

export function emitCity(
  cityCode: string,
  datasetIndex: DatasetIndex,
  options: EmitCityOptions,
): EmitResult {
  const dataDir = options.dataDir ?? DATA_DIR;
  const cityDataDir = path.resolve(dataDir, cityCode);
  if (!fs.existsSync(cityDataDir) || !fs.statSync(cityDataDir).isDirectory()) {
    return { ok: false, reason: 'missing_data_directory' };
  }

  const datasets = resolveShippableDatasets(
    cityCode,
    datasetIndex,
    options.includeOSMData ?? false,
    dataDir,
  );
  if (datasets.length === 0) {
    return { ok: false, reason: 'no_shippable_datasets' };
  }

  const manifest = buildManifest(cityCode, datasetIndex, datasets);
  const manifestResult = validateRegionsManifest(manifest);
  if (!manifestResult.success) {
    return {
      ok: false,
      reason: `invalid_manifest: ${manifestResult.errors.join('; ')}`,
    };
  }

  if (options.validateFeatures) {
    for (const { sourcePath, file } of datasets) {
      const result = validateRegionsFeatureCollection(
        readFeatureCollection(sourcePath),
      );
      if (!result.success) {
        return {
          ok: false,
          reason: `invalid_features (${file}): ${result.errors.slice(0, 3).join('; ')}`,
        };
      }
    }
  }

  const regionsDir = path.join(options.outDir, cityCode, REGIONS_EXPORT_SUBDIR);
  const keepFiles = new Set(datasets.map((dataset) => dataset.file));

  if (options.dryRun) {
    console.log(
      `[RailyardMap] [dry-run] ${cityCode}: would write manifest.json + ${datasets.length} dataset(s) to ${regionsDir}`,
    );
    return { ok: true };
  }

  fs.ensureDirSync(regionsDir);
  pruneStaleDatasets(regionsDir, keepFiles);
  fs.writeFileSync(
    path.join(regionsDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  for (const { sourcePath, file } of datasets) {
    fs.copySync(sourcePath, path.join(regionsDir, file), { overwrite: true });
  }
  console.log(
    `[RailyardMap] ${cityCode}: manifest.json + ${datasets.length} dataset(s) -> ${regionsDir}`,
  );
  return { ok: true };
}
