import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { createDataConfigFromCatalog } from './data-config';
import { extractExternalBundleDatasets } from './external/extractor-runner';
import type { DataConfig } from './handler-types';
import {
  TW_BILINGUAL_NAME_PROPERTY,
  TW_DATASET_ORDER,
  TW_POPULATION_PROPERTY,
  TW_SOURCE_ID_PROPERTY,
} from './tw/constants';
import { loadTWBundleContext, resolveTWSourceDataRoot } from './tw/context';
import {
  applyTWOutputNameFields,
  buildTWLiSourceCollection,
  buildTWOutputNameIndex,
  buildTWTownshipSourceCollection,
} from './tw/source-collections';
import type { TWBundleContext, TWDatasetId } from './tw/types';

const TW_DATA_CONFIGS: Record<TWDatasetId, DataConfig> = {
  township: createDataConfigFromCatalog('township', {
    idProperty: TW_SOURCE_ID_PROPERTY,
    nameProperty: TW_BILINGUAL_NAME_PROPERTY,
    applicableNameProperties: [TW_BILINGUAL_NAME_PROPERTY],
    populationProperty: TW_POPULATION_PROPERTY,
  }),
  li: createDataConfigFromCatalog('li', {
    idProperty: TW_SOURCE_ID_PROPERTY,
    nameProperty: TW_BILINGUAL_NAME_PROPERTY,
    applicableNameProperties: [TW_BILINGUAL_NAME_PROPERTY],
    populationProperty: TW_POPULATION_PROPERTY,
  }),
};

function buildSourceCollectionForDataset(
  context: TWBundleContext,
  datasetId: TWDatasetId,
): FeatureCollection<Polygon | MultiPolygon> {
  switch (datasetId) {
    case 'township':
      return buildTWTownshipSourceCollection(context);
    case 'li':
      return buildTWLiSourceCollection(context);
  }
}

export async function extractTWBoundaries(
  args: ExtractMapFeaturesArgs,
): Promise<void> {
  const bundleId = args.bundle?.trim();
  if (!bundleId) {
    throw new Error('[TW] Missing required --bundle argument.');
  }

  const sourceRoot = resolveTWSourceDataRoot();
  const context = await loadTWBundleContext(sourceRoot, bundleId);
  await extractExternalBundleDatasets(args, context, {
    countryCode: 'TW',
    datasetOrder: TW_DATASET_ORDER,
    dataConfigs: TW_DATA_CONFIGS,
    buildSourceCollection: buildSourceCollectionForDataset,
    preparePostProcessContext: buildTWOutputNameIndex,
    postProcessRegions: (
      regions,
      _context,
      _datasetId,
      _sourceCollection,
      postProcessContext,
    ) => {
      applyTWOutputNameFields(
        regions,
        postProcessContext as ReadonlyMap<
          string,
          { native: string; en: string }
        >,
      );
    },
  });
}

export {
  buildTWLiSourceCollection,
  buildTWTownshipSourceCollection,
  loadTWBundleContext,
};
