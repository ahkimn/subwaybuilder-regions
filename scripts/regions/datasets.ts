import type { DatasetMetadata } from '../../mods/regions/dataset-index';
import {
  DATASET_METADATA_CATALOG,
  resolveCountryDatasetOrder,
} from '../../mods/regions/datasets/catalog';

export function stripGeoJsonExtension(fileName: string): string {
  return fileName.replace(/\.geojson(?:\.gz)?$/i, '');
}

export function getExpectedDatasetIds(countryCode: string): string[] {
  return [...resolveCountryDatasetOrder(countryCode)];
}

export function buildDatasetMetadata(
  datasetId: string,
  countryCode: string,
  featureCount: number,
  fileSizeMB?: number,
): DatasetMetadata {
  const metadata = DATASET_METADATA_CATALOG[datasetId];
  if (!metadata) {
    throw new Error(`[RegionsData] Unknown datasetId: ${datasetId}`);
  }

  return {
    datasetId: metadata.datasetId,
    country: countryCode,
    displayName: metadata.displayName,
    unitSingular: metadata.unitSingular,
    unitPlural: metadata.unitPlural,
    source: metadata.source,
    size: featureCount,
    fileSizeMB,
  };
}

export function assertKnownDataset(datasetId: string): void {
  if (!DATASET_METADATA_CATALOG[datasetId]) {
    throw new Error(`[RegionsData] Unknown datasetId: ${datasetId}`);
  }
}

export function assertDatasetRegisteredForCountry(
  datasetId: string,
  countryCode: string,
): void {
  assertKnownDataset(datasetId);
  const expectedDatasetIds = getExpectedDatasetIds(countryCode);
  if (!expectedDatasetIds.includes(datasetId)) {
    throw new Error(
      `[RegionsData] Dataset ${datasetId} is not registered for ${countryCode}. Expected one of: ${expectedDatasetIds.join(', ') || 'none'}.`,
    );
  }
}
