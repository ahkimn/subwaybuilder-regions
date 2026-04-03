import type { Feature, GeoJsonProperties, Geometry } from 'geojson';
import path from 'path';

import { DATA_INDEX_FILE } from '../../shared/constants';
import type { DatasetMetadata } from '../../shared/dataset-index';
import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { parseNumber } from '../utils/cli';
import { saveGeoJSON, updateIndexJson } from '../utils/files';
import type { BoundaryBox } from '../utils/geometry';
import { filterAndClipRegionsToBoundary } from '../utils/geometry';
import type { DataConfig } from './handler-types';

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
    {
      includeLabelPointCandidates: args.includeLabelPointCandidates,
    },
  );

  console.log(
    `Filtered to ${filteredRegions.length} features within boundary box for ${countryCode} ${dataConfig.displayName}.`,
  );

  if (populationMap && populationMap.size > 0) {
    attachRegionPopulationData(
      filteredRegions,
      populationMap,
      'ID',
      `${countryCode}/${dataConfig.datasetId}`,
    );
  }

  if (!filteredRegions || filteredRegions.length === 0) {
    console.warn(
      `No features found for ${countryCode} ${dataConfig.displayName} within specified boundary box.`,
    );
    return;
  }

  saveBoundaries(args, filteredRegions, dataConfig);
}

export function saveBoundaries(
  args: ExtractMapFeaturesArgs,
  filteredRegions: GeoJSON.Feature[],
  dataConfig: DataConfig,
) {
  const shouldCompress = args.compress ?? true;
  const outputRoot = path.resolve(args.outputRoot ?? 'data');
  const outputFilePath = path.resolve(
    outputRoot,
    args.cityCode,
    `${args.dataType}.geojson${shouldCompress ? '.gz' : ''}`,
  );

  const outputFeatureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: filteredRegions,
  };

  const savedOutput = saveGeoJSON(outputFilePath, outputFeatureCollection, {
    compress: shouldCompress,
  });

  const indexEntry: DatasetMetadata = {
    datasetId: dataConfig.datasetId,
    country: args.countryCode,
    displayName: dataConfig.displayName,
    unitSingular: dataConfig.unitSingular,
    unitPlural: dataConfig.unitPlural,
    source: dataConfig.source,
    size: filteredRegions.length,
    fileSizeMB: savedOutput.fileSizeMB,
  };

  updateIndexJson(
    path.resolve(outputRoot, DATA_INDEX_FILE),
    args.cityCode!,
    indexEntry,
    args.countryCode!,
  );
}

function attachRegionPopulationData(
  features: Array<Feature<Geometry, GeoJsonProperties>>,
  populationIndex: Map<string, string>,
  idProperty: string,
  datasetLabel: string,
): void {
  const shouldWarnOnMissingPopulation = populationIndex.size > 0;
  let matchedCount = 0;
  const missingCodes = new Set<string>();

  for (const feature of features) {
    if (feature.properties!.POPULATION != null) {
      continue; // Skip if population already set
    }

    const featureCodeValue = feature.properties?.[idProperty];
    const featureCode =
      typeof featureCodeValue === 'string'
        ? featureCodeValue
        : String(featureCodeValue ?? '');
    const featurePopulation = populationIndex.has(featureCode)
      ? parseNumber(populationIndex.get(featureCode)!)
      : undefined;

    if (featurePopulation !== undefined) {
      feature.properties = {
        ...feature.properties,
        POPULATION: featurePopulation,
      };
      matchedCount += 1;
    } else if (shouldWarnOnMissingPopulation && featureCode.length > 0) {
      missingCodes.add(featureCode);
    }
  }

  if (shouldWarnOnMissingPopulation && missingCodes.size > 0) {
    const missingCodeList = Array.from(missingCodes);
    console.warn(
      `[Population] Missing population entries for ${datasetLabel}: ${missingCodeList.length}/${features.length}. Sample IDs: ${missingCodeList.slice(0, 10).join(', ')}`,
    );
  }

  console.log(
    `[Population] Attached population entries for ${datasetLabel}: ${matchedCount}/${features.length}.`,
  );
}
