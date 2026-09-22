import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { createDataConfigFromCatalog } from './data-config';
import { extractExternalBundleDatasets } from './external/extractor-runner';
import type { DataConfig } from './handler-types';
import {
  HU_DATASET_ORDER,
  HU_NAME_PROPERTY,
  HU_POPULATION_PROPERTY,
  HU_SOURCE_ID_PROPERTY,
} from './hu/constants';
import { loadHUBundleContext, resolveHUSourceDataRoot } from './hu/context';
import {
  buildHUJarasSourceCollection,
  buildHUTelepulesSourceCollection,
} from './hu/source-collections';
import type { HUBundleContext, HUDatasetId } from './hu/types';

const DATA_CONFIGS: Record<HUDatasetId, DataConfig> = Object.fromEntries(
  HU_DATASET_ORDER.map((datasetId) => [
    datasetId,
    createDataConfigFromCatalog(datasetId, {
      idProperty: HU_SOURCE_ID_PROPERTY,
      nameProperty: HU_NAME_PROPERTY,
      applicableNameProperties: [HU_NAME_PROPERTY],
      populationProperty: HU_POPULATION_PROPERTY,
    }),
  ]),
) as Record<HUDatasetId, DataConfig>;

function buildSourceCollection(
  context: HUBundleContext,
  datasetId: HUDatasetId,
) {
  switch (datasetId) {
    case 'hu-jaras':
      return buildHUJarasSourceCollection(context);
    case 'hu-telepulesek':
      return buildHUTelepulesSourceCollection(context);
  }
}

export async function extractHUBoundaries(args: ExtractMapFeaturesArgs) {
  const bundleId = args.bundle?.trim();
  if (!bundleId) {
    throw new Error('[HU] Missing required --bundle argument.');
  }
  const context = loadHUBundleContext(resolveHUSourceDataRoot(), bundleId);
  await extractExternalBundleDatasets(args, context, {
    countryCode: 'HU',
    datasetOrder: HU_DATASET_ORDER,
    dataConfigs: DATA_CONFIGS,
    buildSourceCollection,
  });
}

export {
  buildHUJarasSourceCollection,
  buildHUTelepulesSourceCollection,
  loadHUBundleContext,
};
