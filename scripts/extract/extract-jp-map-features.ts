import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import type { ExtractMapFeaturesArgs } from '../utils/cli';
import {
  buildRegionsWithoutClipping,
  filterAndClipRegionsToBoundaryGeometry,
} from '../utils/geometry';
import { renderFeaturePreview } from '../utils/preview';
import { createDataConfigFromCatalog } from './data-config';
import type { DataConfig } from './handler-types';
import {
  BILINGUAL_NAME_PROPERTY,
  JP_DATASET_ORDER,
  POPULATION_PROPERTY,
  SOURCE_ID_PROPERTY,
} from './jp/constants';
import {
  assertJPSourcePathExists,
  loadJPBundleContext,
  resolveJPBundleRecord,
  resolveJPSourceDataRoot,
} from './jp/context';
import { cleanLabelName } from './jp/names';
import {
  applyJPOutputNameFields,
  buildOoazaSourceCollection,
  buildShichousonSourceCollection,
} from './jp/source-collections';
import type { JPBundleContext, JPDatasetId } from './jp/types';
import { saveBoundaries } from './process';

const JP_DATA_CONFIGS: Record<JPDatasetId, DataConfig> = {
  shichouson: createDataConfigFromCatalog('shichouson', {
    idProperty: SOURCE_ID_PROPERTY,
    nameProperty: BILINGUAL_NAME_PROPERTY,
    applicableNameProperties: [BILINGUAL_NAME_PROPERTY],
    populationProperty: POPULATION_PROPERTY,
  }),
  ooaza: createDataConfigFromCatalog('ooaza', {
    idProperty: SOURCE_ID_PROPERTY,
    nameProperty: BILINGUAL_NAME_PROPERTY,
    applicableNameProperties: [BILINGUAL_NAME_PROPERTY],
    populationProperty: POPULATION_PROPERTY,
  }),
};

const JP_SOURCE_COLLECTION_BUILDERS: Record<
  JPDatasetId,
  (context: JPBundleContext) => Promise<{
    sourceCollection: FeatureCollection<Polygon | MultiPolygon>;
    namesById: Map<string, { ja: string; en: string }>;
  }>
> = {
  shichouson: buildShichousonSourceCollection,
  ooaza: buildOoazaSourceCollection,
};

export { buildMunicipalityPopulationMap } from './jp/context';
export {
  deriveOoazaName,
  formatBilingualName,
  romanizeJapaneseName,
  selectDominantOazaName,
} from './jp/names';

async function buildSourceCollectionForDataset(
  context: JPBundleContext,
  datasetId: JPDatasetId,
): Promise<{
  sourceCollection: FeatureCollection<Polygon | MultiPolygon>;
  namesById: Map<string, { ja: string; en: string }>;
}> {
  return JP_SOURCE_COLLECTION_BUILDERS[datasetId](context);
}

async function extractSingleJPDataset(
  args: ExtractMapFeaturesArgs,
  context: JPBundleContext,
  datasetId: JPDatasetId,
): Promise<void> {
  const dataConfig = JP_DATA_CONFIGS[datasetId];
  const buildStartTime = Date.now();
  const { sourceCollection, namesById } = await buildSourceCollectionForDataset(
    context,
    datasetId,
  );
  console.log(
    `[JP] Built ${datasetId} source collection: ${sourceCollection.features.length} features in ${Date.now() - buildStartTime}ms`,
  );

  const postProcessStartTime = Date.now();
  // For 市町村 boundaries, we can skip the clipping step since the source data is already perfectly aligned to the boundary geometry.
  const filteredRegions =
    datasetId === 'shichouson'
      ? buildRegionsWithoutClipping(sourceCollection, dataConfig)
      : filterAndClipRegionsToBoundaryGeometry(
          sourceCollection,
          context.boundaryFeature,
          dataConfig,
          {
            progressLabel: `JP ${datasetId} boundary filter`,
          },
        );
  console.log(
    `[JP] Filtered ${datasetId} regions: ${filteredRegions.length} features in ${Date.now() - postProcessStartTime}ms`,
  );

  const namingStartTime = Date.now();
  // Apply output name fields based on the source names for each feature, which is a costly operation since it involves multiple string manipulations and conditional logic for each feature, but is necessary to produce the desired bilingual output labels in Japanese and English.
  applyJPOutputNameFields(filteredRegions, namesById);
  console.log(
    `[JP] Applied ${datasetId} output labels in ${Date.now() - namingStartTime}ms`,
  );

  if (args.preview) {
    renderFeaturePreview(filteredRegions, args.previewCount!);
    return;
  }

  const saveStartTime = Date.now();
  saveBoundaries(
    {
      ...args,
      dataType: datasetId,
    },
    filteredRegions,
    dataConfig,
  );
  console.log(
    `[JP] Saved ${datasetId} dataset in ${Date.now() - saveStartTime}ms`,
  );
}

export async function extractJPBoundaries(
  args: ExtractMapFeaturesArgs,
): Promise<void> {
  // Bundles are how the jp-data repository organizes in-progress city data, and the extraction process is designed to complement that structure
  const bundleId = cleanLabelName(args.bundle);
  if (!bundleId) {
    throw new Error('[JP] Missing required --bundle argument.');
  }

  const sourceRoot = resolveJPSourceDataRoot();
  assertJPSourcePathExists(sourceRoot, 'JP source data root');

  const bundle = resolveJPBundleRecord(sourceRoot, bundleId);
  const context = await loadJPBundleContext(sourceRoot, bundle);
  const datasetIds =
    args.dataType === 'all' ? JP_DATASET_ORDER : [args.dataType as JPDatasetId];

  for (const datasetId of datasetIds) {
    await extractSingleJPDataset(args, context, datasetId);
  }
}
