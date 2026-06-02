import * as turf from '@turf/turf';
import type { GeoJsonProperties } from 'geojson';
import path from 'path';

import { isPolygonFeature } from '../../lib/geometry/helpers';
import { DATA_INDEX_FILE } from '../../mods/regions/constants';
import { parseNumber } from '../utils/cli';
import { updateIndexJson } from '../utils/files';
import {
  buildDatasetMetadata,
  inferChinaCityCodeFromPath,
  resolveCanonicalDatasetId,
} from './datasets';
import { loadFeatureCollection, saveFeatureCollection } from './io';

export type SanitizeRegionDatasetOptions = {
  inputPath: string;
  countryCode: string;
  cityCode?: string;
  datasetId?: string;
  outputRoot?: string;
  compress?: boolean;
  updateIndex?: boolean;
};

export type SanitizeRegionDatasetResult = {
  cityCode: string;
  countryCode: string;
  datasetId: string;
  featureCount: number;
  outputPath: string;
  fileSizeMB?: number;
};

export function sanitizeRegionDataset(
  options: SanitizeRegionDatasetOptions,
): SanitizeRegionDatasetResult {
  const countryCode = options.countryCode.toUpperCase();
  const cityCode =
    options.cityCode?.toUpperCase() ??
    (countryCode === 'CN'
      ? inferChinaCityCodeFromPath(options.inputPath)
      : null);
  if (!cityCode) {
    throw new Error(
      '[RegionsData] Missing --city-code; only CN city codes can be inferred from collaborator filenames.',
    );
  }

  const datasetId = resolveCanonicalDatasetId(
    countryCode,
    options.datasetId ?? options.inputPath,
  );
  if (!datasetId) {
    throw new Error(
      `[RegionsData] Unable to resolve canonical dataset ID for ${options.inputPath}.`,
    );
  }

  const sourceCollection = loadFeatureCollection(options.inputPath);
  const sanitizedCollection = sanitizeFeatureCollection(
    sourceCollection,
    datasetId,
  );
  const outputRoot = path.resolve(options.outputRoot ?? 'data');
  const outputPath = path.join(outputRoot, cityCode, `${datasetId}.geojson`);
  const savedOutput = saveFeatureCollection(outputPath, sanitizedCollection, {
    compress: options.compress ?? true,
  });

  if (options.updateIndex ?? true) {
    updateIndexJson(
      path.join(outputRoot, DATA_INDEX_FILE),
      cityCode,
      buildDatasetMetadata(
        datasetId,
        countryCode,
        sanitizedCollection.features.length,
        savedOutput.fileSizeMB,
      ),
      countryCode,
    );
  }

  return {
    cityCode,
    countryCode,
    datasetId,
    featureCount: sanitizedCollection.features.length,
    outputPath: savedOutput.resolvedFilePath,
    fileSizeMB: savedOutput.fileSizeMB,
  };
}

export function sanitizeFeatureCollection(
  featureCollection: GeoJSON.FeatureCollection,
  datasetId: string,
): GeoJSON.FeatureCollection {
  if (featureCollection.type !== 'FeatureCollection') {
    throw new Error('[RegionsData] Input is not a FeatureCollection.');
  }

  return {
    type: 'FeatureCollection',
    features: featureCollection.features.map((feature, index) => {
      if (!isPolygonFeature(feature)) {
        throw new Error(
          `[RegionsData] ${datasetId} feature ${index} is not Polygon/MultiPolygon.`,
        );
      }
      const properties = feature.properties ?? {};
      const id = resolveStringProperty(properties, ['ID', 'id', 'Id']);
      const name = resolveStringProperty(properties, [
        'NAME',
        'name',
        'Name',
        'DISPLAY_NAME',
      ]);
      if (!id) {
        throw new Error(
          `[RegionsData] ${datasetId} feature ${index} is missing ID/id.`,
        );
      }
      if (!name) {
        throw new Error(
          `[RegionsData] ${datasetId} feature ${index} is missing NAME.`,
        );
      }

      const displayName =
        resolveStringProperty(properties, [
          'DISPLAY_NAME',
          'displayName',
          'display_name',
        ]) ?? name;
      const areaKm2 = turf.area(feature) / 1_000_000;
      const population = parseNumber(properties.POPULATION);

      return {
        type: 'Feature',
        id: feature.id ?? id,
        geometry: feature.geometry,
        properties: {
          ID: id,
          NAME: name,
          DISPLAY_NAME: displayName,
          ...(population !== undefined ? { POPULATION: population } : {}),
          TOTAL_AREA: areaKm2,
          AREA_WITHIN_BBOX: areaKm2,
          ...copyOptionalProperties(properties, [
            'NAME_ZH',
            'NAME_EN',
            'UNIT_TYPE',
            'UNIT_TYPE_CODE',
          ]),
        },
      };
    }),
  };
}

function resolveStringProperty(
  properties: GeoJsonProperties,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = properties?.[key];
    if (value === undefined || value === null) {
      continue;
    }
    const text = String(value).trim();
    if (text.length > 0) {
      return text;
    }
  }
  return null;
}

function copyOptionalProperties(
  properties: GeoJsonProperties,
  keys: string[],
): Record<string, unknown> {
  const copied: Record<string, unknown> = {};
  for (const key of keys) {
    if (properties?.[key] !== undefined && properties[key] !== null) {
      copied[key] = properties[key];
    }
  }
  return copied;
}
