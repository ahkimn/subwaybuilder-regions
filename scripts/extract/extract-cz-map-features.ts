import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { CZ_DATASET_ORDER } from './cz/constants';
import {
  CZ_NAME_PROPERTY,
  CZ_POPULATION_PROPERTY,
  CZ_SOURCE_ID_PROPERTY,
} from './cz/constants';
import { loadCZBundleContext, resolveCZSourceDataRoot } from './cz/context';
import {
  buildCZObceSourceCollection,
  buildCZOkresSourceCollection,
  buildCZZsjSourceCollection,
} from './cz/source-collections';
import type { CZBundleContext, CZDatasetId } from './cz/types';
import { createDataConfigFromCatalog } from './data-config';
import { extractExternalBundleDatasets } from './external/extractor-runner';
import type { DataConfig } from './handler-types';

const CZ_DATA_CONFIGS: Record<CZDatasetId, DataConfig> = {
  okres: createDataConfigFromCatalog('okres', {
    idProperty: CZ_SOURCE_ID_PROPERTY,
    nameProperty: CZ_NAME_PROPERTY,
    applicableNameProperties: [CZ_NAME_PROPERTY],
    populationProperty: CZ_POPULATION_PROPERTY,
  }),
  obce: createDataConfigFromCatalog('obce', {
    idProperty: CZ_SOURCE_ID_PROPERTY,
    nameProperty: CZ_NAME_PROPERTY,
    applicableNameProperties: [CZ_NAME_PROPERTY],
    populationProperty: CZ_POPULATION_PROPERTY,
  }),
  zsj: createDataConfigFromCatalog('zsj', {
    idProperty: CZ_SOURCE_ID_PROPERTY,
    nameProperty: CZ_NAME_PROPERTY,
    applicableNameProperties: [CZ_NAME_PROPERTY],
    populationProperty: CZ_POPULATION_PROPERTY,
  }),
};

function buildSourceCollectionForDataset(
  context: CZBundleContext,
  datasetId: CZDatasetId,
) {
  switch (datasetId) {
    case 'okres':
      return buildCZOkresSourceCollection(context);
    case 'obce':
      return buildCZObceSourceCollection(context);
    case 'zsj':
      return buildCZZsjSourceCollection(context);
  }
}

export async function extractCZBoundaries(
  args: ExtractMapFeaturesArgs,
): Promise<void> {
  const bundleId = args.bundle?.trim();
  if (!bundleId) {
    throw new Error('[CZ] Missing required --bundle argument.');
  }

  const sourceRoot = resolveCZSourceDataRoot();
  const context = loadCZBundleContext(sourceRoot, bundleId);
  await extractExternalBundleDatasets(args, context, {
    countryCode: 'CZ',
    datasetOrder: CZ_DATASET_ORDER,
    dataConfigs: CZ_DATA_CONFIGS,
    buildSourceCollection: buildSourceCollectionForDataset,
  });
}

export {
  buildCZObceSourceCollection,
  buildCZOkresSourceCollection,
  buildCZZsjSourceCollection,
  loadCZBundleContext,
};
