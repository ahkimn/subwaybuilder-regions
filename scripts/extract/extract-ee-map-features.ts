import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { createDataConfigFromCatalog } from './data-config';
import {
  EE_DATASET_ORDER,
  EE_NAME_PROPERTY,
  EE_POPULATION_PROPERTY,
  EE_SOURCE_ID_PROPERTY,
} from './ee/constants';
import { loadEEBundleContext, resolveEESourceDataRoot } from './ee/context';
import {
  buildEEAsustusuksusedSourceCollection,
  buildEEMaakondSourceCollection,
  buildEEOmavalitsusedSourceCollection,
} from './ee/source-collections';
import type { EEBundleContext, EEDatasetId } from './ee/types';
import { extractExternalBundleDatasets } from './external/extractor-runner';
import type { DataConfig } from './handler-types';

const DATA_CONFIGS: Record<EEDatasetId, DataConfig> = Object.fromEntries(
  EE_DATASET_ORDER.map((datasetId) => [
    datasetId,
    createDataConfigFromCatalog(datasetId, {
      idProperty: EE_SOURCE_ID_PROPERTY,
      nameProperty: EE_NAME_PROPERTY,
      applicableNameProperties: [EE_NAME_PROPERTY],
      populationProperty: EE_POPULATION_PROPERTY,
    }),
  ]),
) as Record<EEDatasetId, DataConfig>;

function buildSourceCollection(
  context: EEBundleContext,
  datasetId: EEDatasetId,
) {
  switch (datasetId) {
    case 'ee-maakond':
      return buildEEMaakondSourceCollection(context);
    case 'ee-omavalitsused':
      return buildEEOmavalitsusedSourceCollection(context);
    case 'ee-asustusuksused':
      return buildEEAsustusuksusedSourceCollection(context);
  }
}

export async function extractEEBoundaries(args: ExtractMapFeaturesArgs) {
  const bundleId = args.bundle?.trim();
  if (!bundleId) {
    throw new Error('[EE] Missing required --bundle argument.');
  }
  const context = loadEEBundleContext(resolveEESourceDataRoot(), bundleId);
  await extractExternalBundleDatasets(args, context, {
    countryCode: 'EE',
    datasetOrder: EE_DATASET_ORDER,
    dataConfigs: DATA_CONFIGS,
    buildSourceCollection,
  });
}

export {
  buildEEAsustusuksusedSourceCollection,
  buildEEMaakondSourceCollection,
  buildEEOmavalitsusedSourceCollection,
  loadEEBundleContext,
};
