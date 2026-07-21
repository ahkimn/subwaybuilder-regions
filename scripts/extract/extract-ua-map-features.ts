import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { createDataConfigFromCatalog } from './data-config';
import { extractExternalBundleDatasets } from './external/extractor-runner';
import type { DataConfig } from './handler-types';
import {
  UA_BILINGUAL_NAME_PROPERTY,
  UA_DATASET_ORDER,
  UA_POPULATION_PROPERTY,
  UA_SOURCE_ID_PROPERTY,
} from './ua/constants';
import { loadUABundleContext, resolveUASourceDataRoot } from './ua/context';
import {
  applyUAOutputNameFields,
  buildUAHromadasSourceCollection,
  buildUANaseleniPunktySourceCollection,
  buildUAOutputNameIndex,
  buildUARaionsSourceCollection,
} from './ua/source-collections';
import type { UABundleContext, UADatasetId } from './ua/types';

const DATA_CONFIGS: Record<UADatasetId, DataConfig> = Object.fromEntries(
  UA_DATASET_ORDER.map((datasetId) => [
    datasetId,
    createDataConfigFromCatalog(datasetId, {
      idProperty: UA_SOURCE_ID_PROPERTY,
      nameProperty: UA_BILINGUAL_NAME_PROPERTY,
      applicableNameProperties: [UA_BILINGUAL_NAME_PROPERTY],
      populationProperty: UA_POPULATION_PROPERTY,
    }),
  ]),
) as Record<UADatasetId, DataConfig>;

function buildSourceCollection(
  context: UABundleContext,
  datasetId: UADatasetId,
) {
  switch (datasetId) {
    case 'ua-raions':
      return buildUARaionsSourceCollection(context);
    case 'ua-hromadas':
      return buildUAHromadasSourceCollection(context);
    case 'ua-naseleni-punkty':
      return buildUANaseleniPunktySourceCollection(context);
  }
}

export async function extractUABoundaries(args: ExtractMapFeaturesArgs) {
  const bundleId = args.bundle?.trim();
  if (!bundleId) {
    throw new Error('[UA] Missing required --bundle argument.');
  }
  const context = loadUABundleContext(resolveUASourceDataRoot(), bundleId);
  await extractExternalBundleDatasets(args, context, {
    countryCode: 'UA',
    datasetOrder: UA_DATASET_ORDER,
    dataConfigs: DATA_CONFIGS,
    buildSourceCollection,
    preparePostProcessContext: buildUAOutputNameIndex,
    postProcessRegions: (regions, _context, _dataset, _source, names) =>
      applyUAOutputNameFields(
        regions,
        names as ReadonlyMap<string, { native: string; en: string }>,
      ),
  });
}

export {
  buildUAHromadasSourceCollection,
  buildUANaseleniPunktySourceCollection,
  buildUARaionsSourceCollection,
  loadUABundleContext,
};
