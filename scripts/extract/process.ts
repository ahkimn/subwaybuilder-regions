import type { Feature, GeoJsonProperties, Geometry } from 'geojson';
import path from 'path';

import { DATA_INDEX_FILE } from '../../shared/consts';
import type { DatasetIndexEntry } from '../../shared/dataset-index';
import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { parseNumber } from '../utils/cli';
import { saveGeoJSON, updateIndexJson } from '../utils/files';
import type { BoundaryBox } from '../utils/geometry';
import { filterAndClipRegionsToBoundary } from '../utils/geometry';
import type { DataConfig } from './handler-types';

const OUTPUT_INDEX_FILE = path.resolve('data', DATA_INDEX_FILE);

export function processAndSaveBoundaries(
  geoJson: GeoJSON.FeatureCollection,
  populationMap: Map<string, string> | undefined,
  bbox: BoundaryBox,
  args: ExtractMapFeaturesArgs,
  dataConfig: DataConfig,
  countryCode: string,
) {
  if (!geoJson || !geoJson.features || geoJson.features.length === 0) {
    console.warn(
      `No features returned from source data for ${countryCode} ${dataConfig.displayName} within specified boundary box.`,
    );
    return;
  }

  console.log(
    `Fetched ${geoJson.features.length} total features from source data for ${countryCode} ${dataConfig.displayName}.`,
  );
  const filteredRegions = filterAndClipRegionsToBoundary(
    geoJson as GeoJSON.FeatureCollection,
    bbox,
    dataConfig,
  );

  console.log(
    `Filtered to ${filteredRegions.length} features within boundary box for ${countryCode} ${dataConfig.displayName}.`,
  );

  if (populationMap) {
    attachRegionPopulationData(filteredRegions, populationMap, 'ID');
  }

  if (!filteredRegions || filteredRegions.length === 0) {
    console.warn(
      `No features found for ${countryCode} ${dataConfig.displayName} within specified boundary box.`,
    );
    return;
  }

  console.log(
    `Filtered to ${filteredRegions.length} features within boundary box.`,
  );

  saveBoundaries(args, filteredRegions, dataConfig);
}

export function saveBoundaries(
  args: ExtractMapFeaturesArgs,
  filteredRegions: GeoJSON.Feature[],
  dataConfig: DataConfig,
) {
  const outputFilePath = path.resolve(
    'data',
    args.cityCode,
    `${args.dataType}.geojson`,
  );

  const outputFeatureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: filteredRegions,
  };

  saveGeoJSON(outputFilePath, outputFeatureCollection);

  const indexEntry: DatasetIndexEntry = {
    datasetId: dataConfig.datasetId,
    displayName: dataConfig.displayName,
    unitSingular: dataConfig.unitSingular,
    unitPlural: dataConfig.unitPlural,
    source: dataConfig.source,
    size: filteredRegions.length,
  };

  updateIndexJson(OUTPUT_INDEX_FILE, args.cityCode!, indexEntry, args.countryCode!);
}

function attachRegionPopulationData(
  features: Array<Feature<Geometry, GeoJsonProperties>>,
  populationIndex: Map<string, string>,
  idProperty: string,
): void {
  for (const feature of features) {
    if (feature.properties!.POPULATION != null) {
      continue; // Skip if population already set
    }

    // Name matching is fragile but BUA codes are not consistent between years?
    const featureCode = feature.properties![idProperty];
    const featurePopulation = populationIndex.has(featureCode)
      ? parseNumber(populationIndex.get(featureCode)!)
      : null;

    if (featurePopulation !== null) {
      feature.properties = {
        ...feature.properties,
        POPULATION: featurePopulation,
      };
    } else {
      console.warn(
        '  No population data found for feature:',
        feature.properties!.NAME,
        ' ID: ',
        featureCode,
      );
    }
  }
}
