import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  MultiPolygon,
  Polygon,
} from 'geojson';

import type { ExtractMapFeaturesArgs } from '../../utils/cli';
import { buildRegionsWithoutClipping } from '../../utils/geometry';
import { renderFeaturePreview } from '../../utils/preview';
import type { DataConfig } from '../handler-types';
import { saveBoundaries } from '../process';

type PolygonFeatureCollection = FeatureCollection<Polygon | MultiPolygon>;

type ExternalDatasetRunnerConfig<TContext, TDatasetId extends string> = {
  countryCode: string;
  datasetOrder: readonly TDatasetId[];
  dataConfigs: Record<TDatasetId, DataConfig>;
  buildSourceCollection(
    context: TContext,
    datasetId: TDatasetId,
  ): PolygonFeatureCollection | Promise<PolygonFeatureCollection>;
  preparePostProcessContext?(
    sourceCollection: PolygonFeatureCollection,
  ): unknown;
  postProcessRegions?(
    regions: Array<Feature<Geometry, GeoJsonProperties>>,
    context: TContext,
    datasetId: TDatasetId,
    sourceCollection: PolygonFeatureCollection,
    postProcessContext: unknown,
  ): void | Promise<void>;
};

async function extractSingleExternalDataset<
  TContext,
  TDatasetId extends string,
>(
  args: ExtractMapFeaturesArgs,
  context: TContext,
  datasetId: TDatasetId,
  config: ExternalDatasetRunnerConfig<TContext, TDatasetId>,
): Promise<void> {
  const dataConfig = config.dataConfigs[datasetId];
  const buildStartTime = Date.now();
  const sourceCollection = await config.buildSourceCollection(
    context,
    datasetId,
  );
  console.log(
    `[${config.countryCode}] Built ${datasetId} source collection: ${sourceCollection.features.length} features in ${Date.now() - buildStartTime}ms`,
  );
  const postProcessContext =
    config.preparePostProcessContext?.(sourceCollection) ?? null;

  const postProcessStartTime = Date.now();
  const regions = buildRegionsWithoutClipping(sourceCollection, dataConfig, {
    includeLabelPointCandidates: args.includeLabelPointCandidates,
  });
  await config.postProcessRegions?.(
    regions,
    context,
    datasetId,
    sourceCollection,
    postProcessContext,
  );
  console.log(
    `[${config.countryCode}] Built ${datasetId} regions without clipping: ${regions.length} features in ${Date.now() - postProcessStartTime}ms`,
  );

  if (args.preview) {
    renderFeaturePreview(regions, args.previewCount!);
    return;
  }

  const saveStartTime = Date.now();
  saveBoundaries({ ...args, dataType: datasetId }, regions, dataConfig);
  console.log(
    `[${config.countryCode}] Saved ${datasetId} dataset in ${Date.now() - saveStartTime}ms`,
  );
}

export async function extractExternalBundleDatasets<
  TContext,
  TDatasetId extends string,
>(
  args: ExtractMapFeaturesArgs,
  context: TContext,
  config: ExternalDatasetRunnerConfig<TContext, TDatasetId>,
): Promise<void> {
  const datasetIds =
    args.dataType === 'all'
      ? config.datasetOrder
      : [args.dataType as TDatasetId];

  for (const datasetId of datasetIds) {
    if (!config.dataConfigs[datasetId]) {
      throw new Error(
        `[${config.countryCode}] Unsupported data type: ${datasetId}. Supported data types: ${config.datasetOrder.join(', ')}, all`,
      );
    }
    await extractSingleExternalDataset(args, context, datasetId, config);
  }
}
