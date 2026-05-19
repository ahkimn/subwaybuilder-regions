import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { buildRegionsWithoutClipping } from '../utils/geometry';
import { renderFeaturePreview } from '../utils/preview';
import { createDataConfigFromCatalog } from './data-config';
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
import { saveBoundaries } from './process';

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
): FeatureCollection<Polygon | MultiPolygon> {
  switch (datasetId) {
    case 'powiat':
      return buildPLPowiatSourceCollection(context);
    case 'gmina':
      return buildPLGminaSourceCollection(context);
    case 'rejon':
      return buildPLRejonSourceCollection(context);
  }
}

async function extractSinglePLDataset(
  args: ExtractMapFeaturesArgs,
  context: PLBundleContext,
  datasetId: PLDatasetId,
): Promise<void> {
  const dataConfig = PL_DATA_CONFIGS[datasetId];
  const buildStartTime = Date.now();
  const sourceCollection = buildSourceCollectionForDataset(context, datasetId);
  console.log(
    `[PL] Built ${datasetId} source collection: ${sourceCollection.features.length} features in ${Date.now() - buildStartTime}ms`,
  );

  const postProcessStartTime = Date.now();
  const regions = buildRegionsWithoutClipping(sourceCollection, dataConfig, {
    includeLabelPointCandidates: args.includeLabelPointCandidates,
  });
  console.log(
    `[PL] Built ${datasetId} regions without clipping: ${regions.length} features in ${Date.now() - postProcessStartTime}ms`,
  );

  if (args.preview) {
    renderFeaturePreview(regions, args.previewCount!);
    return;
  }

  const saveStartTime = Date.now();
  saveBoundaries({ ...args, dataType: datasetId }, regions, dataConfig);
  console.log(
    `[PL] Saved ${datasetId} dataset in ${Date.now() - saveStartTime}ms`,
  );
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
  const datasetIds =
    args.dataType === 'all' ? PL_DATASET_ORDER : [args.dataType as PLDatasetId];

  for (const datasetId of datasetIds) {
    if (!PL_DATA_CONFIGS[datasetId]) {
      throw new Error(
        `[PL] Unsupported data type: ${datasetId}. Supported data types: ${PL_DATASET_ORDER.join(', ')}, all`,
      );
    }
    await extractSinglePLDataset(args, context, datasetId);
  }
}

export {
  buildPLGminaSourceCollection,
  buildPLPowiatSourceCollection,
  buildPLRejonSourceCollection,
  loadPLBundleContext,
};
