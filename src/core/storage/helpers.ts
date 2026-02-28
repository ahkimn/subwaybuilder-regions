import { bytesToMB } from '../../../shared/utils/size';
import type { SystemPerformanceInfo } from '../../types';

export type LocalDatasetProps = {
  dataPath: string;
  isPresent: boolean;
  compressed: boolean;
  fileSizeMB?: number;
};

export function buildLocalDatasetPath(
  localModsDataRoot: string,
  cityCode: string,
  datasetId: string,
  extension: '.geojson' | '.geojson.gz' = '.geojson',
): string {
  return encodeURI(
    `file:///${localModsDataRoot}/${cityCode}/${datasetId}${extension}`,
  );
}

export function buildLocalDatasetCandidatePaths(
  localModsDataRoot: string,
  cityCode: string,
  datasetId: string,
): [string, string] {
  return [
    buildLocalDatasetPath(
      localModsDataRoot,
      cityCode,
      datasetId,
      '.geojson.gz',
    ),
    buildLocalDatasetPath(localModsDataRoot, cityCode, datasetId, '.geojson'),
  ];
}

export async function tryLocalDatasetPaths(
  paths: readonly string[],
): Promise<LocalDatasetProps> {
  for (const path of paths) {
    const probed = await tryDatasetPath(path);
    if (probed.isPresent) {
      return probed;
    }
  }

  const defaultPath = paths[0] ?? '';
  return {
    dataPath: defaultPath,
    isPresent: false,
    compressed: defaultPath.endsWith('.gz'),
  };
}

export async function tryDatasetPath(
  dataPath: string,
): Promise<LocalDatasetProps> {
  try {
    const response = await fetch(dataPath);
    if (!response.ok) {
      return {
        dataPath,
        isPresent: false,
        compressed: dataPath.endsWith('.gz'),
      };
    }

    return {
      dataPath,
      isPresent: true,
      compressed: dataPath.endsWith('.gz'),
      fileSizeMB: await resolveFileSizeMB(response),
    };
  } catch {
    return {
      dataPath,
      isPresent: false,
      compressed: dataPath.endsWith('.gz'),
    };
  }
}

// Helper function to read a local GeoJSON file and return its feature count whilst also validating the GeoJSON format
export async function getFeatureCountForLocalDataset(
  dataPath: string,
): Promise<number | null> {
  try {
    const response = await fetch(dataPath);
    if (!response.ok) {
      return null;
    }

    const raw = await response.text();
    let geoJson: GeoJSON.FeatureCollection;
    try {
      geoJson = JSON.parse(raw) as GeoJSON.FeatureCollection;
    } catch (error) {
      const preview = raw.slice(0, 180).replace(/\s+/g, ' ');
      console.error(
        `[Regions] Failed to parse fallback GeoJSON at ${dataPath}. Preview: ${preview}`,
        error,
      );
      return null;
    }

    if (!Array.isArray(geoJson.features)) {
      console.warn(
        `[Regions] Invalid fallback GeoJSON (missing features array) at ${dataPath}`,
      );
      return null;
    }

    return geoJson.features.length;
  } catch {
    return null;
  }
}

// Small helper function to resolve a local file's size in MB for user information and logging purposes.
async function resolveFileSizeMB(
  response: Response,
): Promise<number | undefined> {
  const headerValue = response.headers.get('content-length');
  if (headerValue) {
    const parsed = Number.parseInt(headerValue, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return bytesToMB(parsed);
    }
  }

  try {
    const bytes = (await response.clone().arrayBuffer()).byteLength;
    return bytes > 0 ? bytesToMB(bytes) : undefined;
  } catch {
    return undefined;
  }
}

export function resolveRuntimePlatform(
  systemPerformanceInfo: SystemPerformanceInfo | null,
): string {
  if (systemPerformanceInfo?.platform) {
    return systemPerformanceInfo.platform;
  }
  // Fallback to user agent parsing if the fetched performance information is unavailable...
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes('windows')) {
    return 'win32';
  }
  if (userAgent.includes('mac')) {
    return 'darwin';
  }
  return 'linux';
}
