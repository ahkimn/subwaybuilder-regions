import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { createDataConfigFromCatalog } from './data-config';
import { extractExternalBundleDatasets } from './external/extractor-runner';
import type { DataConfig } from './handler-types';
import {
  SK_DATASET_ORDER,
  SK_NAME_PROPERTY,
  SK_POPULATION_PROPERTY,
  SK_SOURCE_ID_PROPERTY,
} from './sk/constants';
import { loadSKBundleContext, resolveSKSourceDataRoot } from './sk/context';
import {
  buildSKObceSourceCollection,
  buildSKOkresSourceCollection,
  buildSKZsjSourceCollection,
} from './sk/source-collections';
import type { SKBundleContext, SKDatasetId } from './sk/types';

// Subscripted ids: SK uses the same three words as CZ (okres / obec / ZSJ) but
// a different publisher and code system, so they cannot share one catalog entry.
const SK_DATA_CONFIGS: Record<SKDatasetId, DataConfig> = {
  okres_sk: createDataConfigFromCatalog('okres_sk', {
    idProperty: SK_SOURCE_ID_PROPERTY,
    nameProperty: SK_NAME_PROPERTY,
    applicableNameProperties: [SK_NAME_PROPERTY],
    populationProperty: SK_POPULATION_PROPERTY,
  }),
  obec_sk: createDataConfigFromCatalog('obec_sk', {
    idProperty: SK_SOURCE_ID_PROPERTY,
    nameProperty: SK_NAME_PROPERTY,
    applicableNameProperties: [SK_NAME_PROPERTY],
    populationProperty: SK_POPULATION_PROPERTY,
  }),
  zsj_sk: createDataConfigFromCatalog('zsj_sk', {
    idProperty: SK_SOURCE_ID_PROPERTY,
    nameProperty: SK_NAME_PROPERTY,
    applicableNameProperties: [SK_NAME_PROPERTY],
    populationProperty: SK_POPULATION_PROPERTY,
  }),
};

function buildSourceCollectionForDataset(
  context: SKBundleContext,
  datasetId: SKDatasetId,
) {
  switch (datasetId) {
    case 'okres_sk':
      return buildSKOkresSourceCollection(context);
    case 'obec_sk':
      return buildSKObceSourceCollection(context);
    case 'zsj_sk':
      return buildSKZsjSourceCollection(context);
  }
}

export async function extractSKBoundaries(
  args: ExtractMapFeaturesArgs,
): Promise<void> {
  const bundleId = args.bundle?.trim();
  if (!bundleId) {
    throw new Error('[SK] Missing required --bundle argument.');
  }

  const sourceRoot = resolveSKSourceDataRoot();
  const context = loadSKBundleContext(sourceRoot, bundleId);
  await extractExternalBundleDatasets(args, context, {
    countryCode: 'SK',
    datasetOrder: SK_DATASET_ORDER,
    dataConfigs: SK_DATA_CONFIGS,
    buildSourceCollection: buildSourceCollectionForDataset,
  });
}

export {
  buildSKObceSourceCollection,
  buildSKOkresSourceCollection,
  buildSKZsjSourceCollection,
  loadSKBundleContext,
};
