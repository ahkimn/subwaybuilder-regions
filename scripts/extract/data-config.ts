import { DATASET_METADATA_CATALOG } from '../../shared/datasets/catalog';
import type { DataConfig } from './handler-types';

type DataConfigOverrides = Omit<
  DataConfig,
  'datasetId' | 'displayName' | 'unitSingular' | 'unitPlural' | 'source'
>;

// Helper function to populate DataConfig fields from the Static Catalog of datasets so that the fields do not have to be duplicated.
export function createDataConfigFromCatalog(
  datasetId: string,
  overrides: DataConfigOverrides,
): DataConfig {
  const metadata = DATASET_METADATA_CATALOG[datasetId];
  if (!metadata) {
    throw new Error(
      `[Extract] Missing dataset metadata catalog entry for datasetId: ${datasetId}`,
    );
  }

  return {
    datasetId: metadata.datasetId,
    displayName: metadata.displayName,
    unitSingular: metadata.unitSingular,
    unitPlural: metadata.unitPlural,
    source: metadata.source,
    ...overrides,
  };
}
