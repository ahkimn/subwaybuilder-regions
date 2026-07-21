import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { createDataConfigFromCatalog } from './data-config';
import { extractExternalBundleDatasets } from './external/extractor-runner';
import type { DataConfig } from './handler-types';
import {
  LV_DATASET_ORDER,
  LV_NAME_PROPERTY,
  LV_POPULATION_PROPERTY,
  LV_SOURCE_ID_PROPERTY,
} from './lv/constants';
import { loadLVBundleContext, resolveLVSourceDataRoot } from './lv/context';
import {
  buildLVApkaimesSourceCollection,
  buildLVPasvaldibasSourceCollection,
} from './lv/source-collections';
import type { LVBundleContext, LVDatasetId } from './lv/types';

const DATA_CONFIGS: Record<LVDatasetId, DataConfig> = Object.fromEntries(
  LV_DATASET_ORDER.map((datasetId) => [
    datasetId,
    createDataConfigFromCatalog(datasetId, {
      idProperty: LV_SOURCE_ID_PROPERTY,
      nameProperty: LV_NAME_PROPERTY,
      applicableNameProperties: [LV_NAME_PROPERTY],
      populationProperty: LV_POPULATION_PROPERTY,
    }),
  ]),
) as Record<LVDatasetId, DataConfig>;

function buildSourceCollection(
  context: LVBundleContext,
  datasetId: LVDatasetId,
) {
  switch (datasetId) {
    case 'lv-pasvaldibas':
      return buildLVPasvaldibasSourceCollection(context);
    case 'lv-apkaimes':
      return buildLVApkaimesSourceCollection(context);
  }
}

export async function extractLVBoundaries(args: ExtractMapFeaturesArgs) {
  const bundleId = args.bundle?.trim();
  if (!bundleId) {
    throw new Error('[LV] Missing required --bundle argument.');
  }
  const context = loadLVBundleContext(resolveLVSourceDataRoot(), bundleId);
  await extractExternalBundleDatasets(args, context, {
    countryCode: 'LV',
    datasetOrder: LV_DATASET_ORDER,
    dataConfigs: DATA_CONFIGS,
    buildSourceCollection,
  });
}

export {
  buildLVApkaimesSourceCollection,
  buildLVPasvaldibasSourceCollection,
  loadLVBundleContext,
};
