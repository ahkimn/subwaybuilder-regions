import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { buildRegionsWithoutClipping } from '../utils/geometry';
import { renderFeaturePreview } from '../utils/preview';
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
import type { DataConfig } from './handler-types';
import { saveBoundaries } from './process';

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
): FeatureCollection<Polygon | MultiPolygon> {
  switch (datasetId) {
    case 'okres':
      return buildCZOkresSourceCollection(context);
    case 'obce':
      return buildCZObceSourceCollection(context);
    case 'zsj':
      return buildCZZsjSourceCollection(context);
  }
}

async function extractSingleCZDataset(
  args: ExtractMapFeaturesArgs,
  context: CZBundleContext,
  datasetId: CZDatasetId,
): Promise<void> {
  const dataConfig = CZ_DATA_CONFIGS[datasetId];
  const buildStartTime = Date.now();
  const sourceCollection = buildSourceCollectionForDataset(context, datasetId);
  console.log(
    `[CZ] Built ${datasetId} source collection: ${sourceCollection.features.length} features in ${Date.now() - buildStartTime}ms`,
  );

  const postProcessStartTime = Date.now();
  const regions = buildRegionsWithoutClipping(sourceCollection, dataConfig, {
    includeLabelPointCandidates: args.includeLabelPointCandidates,
  });
  console.log(
    `[CZ] Built ${datasetId} regions without clipping: ${regions.length} features in ${Date.now() - postProcessStartTime}ms`,
  );

  if (args.preview) {
    renderFeaturePreview(regions, args.previewCount!);
    return;
  }

  const saveStartTime = Date.now();
  saveBoundaries({ ...args, dataType: datasetId }, regions, dataConfig);
  console.log(
    `[CZ] Saved ${datasetId} dataset in ${Date.now() - saveStartTime}ms`,
  );
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
  const datasetIds =
    args.dataType === 'all' ? CZ_DATASET_ORDER : [args.dataType as CZDatasetId];

  for (const datasetId of datasetIds) {
    if (!CZ_DATA_CONFIGS[datasetId]) {
      throw new Error(
        `[CZ] Unsupported data type: ${datasetId}. Supported data types: ${CZ_DATASET_ORDER.join(', ')}, all`,
      );
    }
    await extractSingleCZDataset(args, context, datasetId);
  }
}

export {
  buildCZObceSourceCollection,
  buildCZOkresSourceCollection,
  buildCZZsjSourceCollection,
  loadCZBundleContext,
};
