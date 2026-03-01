import path from 'path';

import { SOURCE_DATA_DIR } from '../../shared/constants';
import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { loadGeoJSON } from '../utils/files';
import type { BoundaryBox } from '../utils/geometry';
import { expandBBox } from '../utils/geometry';
import { renderFeaturePreview } from '../utils/preview';
import {
  buildCAStatCanArcGISQuery,
  fetchGeoJSONFromArcGIS,
} from '../utils/queries';
import { createDataConfigFromCatalog } from './data-config';
import type { DataConfig } from './handler-types';
import { processAndSaveBoundaries } from './process';

const CA_LAYER_IDS = {
  csds: 9,
  feds: 3,
  fsas: 14,
} as const;

const CA_PED_BOUNDARIES = path.resolve(
  SOURCE_DATA_DIR,
  'ca_ped_boundaries.geojson.gz',
);

const PREVIEW_OUT_FIELDS = '*';

export const CA_DATA_CONFIGS: Record<string, DataConfig> = {
  feds: createDataConfigFromCatalog('feds', {
    idProperty: 'FEDUID',
    nameProperty: 'FEDENAME',
    applicableNameProperties: ['FEDENAME', 'FEDNAME', 'FEDFNAME'],
  }),
  peds: createDataConfigFromCatalog('peds', {
    idProperty: 'ID',
    nameProperty: 'DISPLAY_NAME',
    applicableNameProperties: ['DISPLAY_NAME', 'NAME'],
  }),
  csds: createDataConfigFromCatalog('csds', {
    idProperty: 'CSDUID',
    nameProperty: 'CSDNAME',
    applicableNameProperties: ['CSDNAME'],
  }),
  fsas: createDataConfigFromCatalog('fsas', {
    idProperty: 'CFSAUID',
    nameProperty: 'CFSAUID',
    applicableNameProperties: ['CFSAUID', 'PRNAME'],
  }),
};

type CABoundaryDataHandler = {
  dataConfig: DataConfig;
  layerId?: number;
  outFields?: string;
  localFilePath?: string;
};

const CA_BOUNDARY_DATA_HANDLERS: Record<string, CABoundaryDataHandler> = {
  feds: {
    dataConfig: CA_DATA_CONFIGS['feds'],
    layerId: CA_LAYER_IDS.feds,
    outFields: 'FEDUID,FEDNAME,FEDENAME,FEDFNAME,PRUID',
  },
  peds: {
    dataConfig: CA_DATA_CONFIGS['peds'],
    localFilePath: CA_PED_BOUNDARIES,
  },
  csds: {
    dataConfig: CA_DATA_CONFIGS['csds'],
    layerId: CA_LAYER_IDS.csds,
    outFields: 'CSDUID,CSDNAME,CSDTYPE,PRUID',
  },
  fsas: {
    dataConfig: CA_DATA_CONFIGS['fsas'],
    layerId: CA_LAYER_IDS.fsas,
    outFields: 'CFSAUID,PRUID,PRNAME',
  },
};

async function extractCABoundariesByLayer(
  bbox: BoundaryBox,
  layerId: number,
  outFields: string,
  featureType: string,
): Promise<{ geoJson: GeoJSON.FeatureCollection }> {
  const query = buildCAStatCanArcGISQuery(bbox, layerId, outFields);
  const geoJson = await fetchGeoJSONFromArcGIS(query, { featureType });
  return { geoJson };
}

export async function extractCABoundaries(
  args: ExtractMapFeaturesArgs,
  bbox: BoundaryBox,
): Promise<void> {
  const handler = CA_BOUNDARY_DATA_HANDLERS[args.dataType];
  if (!handler) {
    throw new Error(`Unsupported data type for CA: ${args.dataType}`);
  }

  const geoJson = handler.localFilePath
    ? loadGeoJSON(handler.localFilePath)
    : (
        await extractCABoundariesByLayer(
          expandBBox(bbox, 0.01),
          handler.layerId!,
          args.preview ? PREVIEW_OUT_FIELDS : handler.outFields!,
          handler.dataConfig.displayName.toLowerCase(),
        )
      ).geoJson;

  if (args.preview) {
    renderFeaturePreview(geoJson.features, args.previewCount!);
    return;
  }

  processAndSaveBoundaries(
    geoJson,
    undefined,
    bbox,
    args,
    handler.dataConfig,
    'CA',
  );
}
