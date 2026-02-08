import path from "path";
import { ExtractMapFeaturesArgs } from "../utils/cli";
import { saveGeoJSON, updateIndexJson } from "../utils/files";
import { attachRegionPopulationData, BoundaryBox, filterAndClipRegionsToBoundary } from "../utils/geometry";
import { DataConfig } from "./handler-types";

const OUTPUT_INDEX_FILE = path.resolve('data', 'index.json');


export function processAndSaveBoundaries(
  geoJson: GeoJSON.FeatureCollection,
  populationMap: Map<string, string> | undefined,
  bbox: BoundaryBox,
  args: ExtractMapFeaturesArgs,
  dataConfig: DataConfig,
  countryCode: string
) {

  if (!geoJson || !geoJson.features || geoJson.features.length === 0) {
    console.warn(`No features returned from source API for US ${dataConfig.displayName} within specified boundary box.`);
    return;
  }

  console.log(`Fetched ${geoJson.features.length} total features from source API for ${countryCode} ${dataConfig.displayName}.`);

  const filteredRegions = filterAndClipRegionsToBoundary(
    geoJson as GeoJSON.FeatureCollection,
    bbox,
    dataConfig
  );

  console.log(`Filtered to ${filteredRegions.length} features within boundary box for ${countryCode} ${dataConfig.displayName}.`);

  if (populationMap) {
    attachRegionPopulationData(
      filteredRegions,
      populationMap,
      'ID'
    )
  }


  if (!filteredRegions || filteredRegions.length === 0) {
    console.warn(`No features found for ${countryCode} ${dataConfig.displayName} within specified boundary box.`);
    return;
  }

  console.log(`Filtered to ${filteredRegions.length} features within boundary box.`);

  saveBoundaries(args, filteredRegions, dataConfig.displayName);
}


export function saveBoundaries(args: ExtractMapFeaturesArgs, filteredRegions: GeoJSON.Feature[], displayName: string) {
  const outputFilePath = path.resolve(
    'data', args.cityCode, `${args.dataType}.geojson`);

  const outputFeatureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: filteredRegions
  };

  saveGeoJSON(
    outputFilePath,
    outputFeatureCollection
  );

  updateIndexJson(
    OUTPUT_INDEX_FILE,
    args.cityCode,
    args.dataType,
    displayName
  );
}
