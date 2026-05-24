import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { createDataConfigFromCatalog } from './data-config';
import { extractExternalBundleDatasets } from './external/extractor-runner';
import type { DataConfig } from './handler-types';
import {
  PL_DATASET_ORDER,
  PL_NAME_PROPERTY,
  PL_POPULATION_PROPERTY,
  PL_SOURCE_ID_PROPERTY,
} from './pl/constants';
import { loadPLBundleContext, resolvePLSourceDataRoot } from './pl/context';
import {
  buildPLGminaSourceCollection,
  buildPLPowiatSourceCollection,
  buildPLRejonSourceCollection,
} from './pl/source-collections';
import type { PLBundleContext, PLDatasetId } from './pl/types';

const PL_DATA_CONFIGS: Record<PLDatasetId, DataConfig> = {
  powiat: createDataConfigFromCatalog('powiat', {
    idProperty: PL_SOURCE_ID_PROPERTY,
    nameProperty: PL_NAME_PROPERTY,
    applicableNameProperties: [PL_NAME_PROPERTY],
    populationProperty: PL_POPULATION_PROPERTY,
  }),
  gmina: createDataConfigFromCatalog('gmina', {
    idProperty: PL_SOURCE_ID_PROPERTY,
    nameProperty: PL_NAME_PROPERTY,
    applicableNameProperties: [PL_NAME_PROPERTY],
    populationProperty: PL_POPULATION_PROPERTY,
  }),
  rejon: createDataConfigFromCatalog('rejon', {
    idProperty: PL_SOURCE_ID_PROPERTY,
    nameProperty: PL_NAME_PROPERTY,
    applicableNameProperties: [PL_NAME_PROPERTY],
    populationProperty: PL_POPULATION_PROPERTY,
  }),
};

function buildSourceCollectionForDataset(
  context: PLBundleContext,
  datasetId: PLDatasetId,
) {
  switch (datasetId) {
    case 'powiat':
      return buildPLPowiatSourceCollection(context);
    case 'gmina':
      return buildPLGminaSourceCollection(context);
    case 'rejon':
      return buildPLRejonSourceCollection(context);
  }
}

export async function extractPLBoundaries(
  args: ExtractMapFeaturesArgs,
): Promise<void> {
  const bundleId = args.bundle?.trim();
  if (!bundleId) {
    throw new Error('[PL] Missing required --bundle argument.');
  }

  const sourceRoot = resolvePLSourceDataRoot();
  const context = loadPLBundleContext(sourceRoot, bundleId);
  await extractExternalBundleDatasets(args, context, {
    countryCode: 'PL',
    datasetOrder: PL_DATASET_ORDER,
    dataConfigs: PL_DATA_CONFIGS,
    buildSourceCollection: buildSourceCollectionForDataset,
  });
}

export {
  buildPLGminaSourceCollection,
  buildPLPowiatSourceCollection,
  buildPLRejonSourceCollection,
  loadPLBundleContext,
};
