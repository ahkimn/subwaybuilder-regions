import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { createDataConfigFromCatalog } from './data-config';
import { extractExternalBundleDatasets } from './external/extractor-runner';
import type { DataConfig } from './handler-types';
import {
  LT_DATASET_ORDER,
  LT_NAME_PROPERTY,
  LT_POPULATION_PROPERTY,
  LT_SOURCE_ID_PROPERTY,
} from './lt/constants';
import { loadLTBundleContext, resolveLTSourceDataRoot } from './lt/context';
import {
  buildLTGyvenvietesSourceCollection,
  buildLTSavivaldybesSourceCollection,
  buildLTSeniunijosSourceCollection,
} from './lt/source-collections';
import type { LTBundleContext, LTDatasetId } from './lt/types';

const DATA_CONFIGS: Record<LTDatasetId, DataConfig> = Object.fromEntries(
  LT_DATASET_ORDER.map((datasetId) => [
    datasetId,
    createDataConfigFromCatalog(datasetId, {
      idProperty: LT_SOURCE_ID_PROPERTY,
      nameProperty: LT_NAME_PROPERTY,
      applicableNameProperties: [LT_NAME_PROPERTY],
      populationProperty: LT_POPULATION_PROPERTY,
    }),
  ]),
) as Record<LTDatasetId, DataConfig>;

function buildSourceCollection(
  context: LTBundleContext,
  datasetId: LTDatasetId,
) {
  switch (datasetId) {
    case 'lt-savivaldybes':
      return buildLTSavivaldybesSourceCollection(context);
    case 'lt-seniunijos':
      return buildLTSeniunijosSourceCollection(context);
    case 'lt-gyvenvietes':
      return buildLTGyvenvietesSourceCollection(context);
  }
}

export async function extractLTBoundaries(args: ExtractMapFeaturesArgs) {
  const bundleId = args.bundle?.trim();
  if (!bundleId) {
    throw new Error('[LT] Missing required --bundle argument.');
  }
  const context = loadLTBundleContext(resolveLTSourceDataRoot(), bundleId);
  await extractExternalBundleDatasets(args, context, {
    countryCode: 'LT',
    datasetOrder: LT_DATASET_ORDER,
    dataConfigs: DATA_CONFIGS,
    buildSourceCollection,
  });
}

export {
  buildLTGyvenvietesSourceCollection,
  buildLTSavivaldybesSourceCollection,
  buildLTSeniunijosSourceCollection,
  loadLTBundleContext,
};
