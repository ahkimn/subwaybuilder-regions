import fs from 'fs-extra';
import path from 'path';

import { isPolygonFeature } from '../../lib/geometry/helpers';
import { DATA_INDEX_FILE } from '../../mods/regions/constants';
import { parseNumber } from '../utils/cli';
import { updateIndexJson } from '../utils/files';
import { resolvePrimaryLabelPoint } from '../utils/geometry';
import {
  assertDatasetRegisteredForCountry,
  buildDatasetMetadata,
} from './datasets';
import {
  copyCitySupportFiles,
  isGeoJsonDatasetPath,
  listDatasetFiles,
  loadFeatureCollection,
  loadRegionInput,
  type RegionDatasetFile,
  saveFeatureCollection,
} from './io';

export type PlaceRegionLabelsOptions = {
  inputPath: string;
  countryCode: string;
  cityCode: string;
  outputRoot?: string;
  inPlace?: boolean;
  refresh?: boolean;
  updateIndex?: boolean;
};

export type DatasetLabelPlacementResult = {
  datasetId: string;
  outputPath: string;
  added: number;
  refreshed: number;
  skipped: number;
  nonPolygonFeatures: number;
  featureCount: number;
  fileSizeMB?: number;
};

export type PlaceRegionLabelsResult = {
  outputs: DatasetLabelPlacementResult[];
};

const DEFAULT_LABEL_OUTPUT_ROOT = path.join('tmp', 'region-labels');

export function placeRegionLabels(
  options: PlaceRegionLabelsOptions,
): PlaceRegionLabelsResult {
  const countryCode = requireExplicitCode(
    options.countryCode,
    'countryCode',
  ).toUpperCase();
  const cityCode = requireExplicitCode(
    options.cityCode,
    'cityCode',
  ).toUpperCase();
  const resolvedInputPath = path.resolve(options.inputPath);
  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(
      `[RegionsData] Input path does not exist: ${options.inputPath}`,
    );
  }

  if (fs.statSync(resolvedInputPath).isFile()) {
    if (isGeoJsonDatasetPath(resolvedInputPath)) {
      if (options.updateIndex) {
        throw new Error(
          '[RegionsData] --update-index requires a city directory or archive.',
        );
      }
      const result = {
        outputs: [
          placeLabelsForDatasetFile(
            {
              datasetId: path
                .basename(resolvedInputPath)
                .replace(/\.geojson(?:\.gz)?$/i, ''),
              fileName: path.basename(resolvedInputPath),
              filePath: resolvedInputPath,
              compressed: resolvedInputPath.toLowerCase().endsWith('.gz'),
            },
            resolveSingleFileOutputPath(resolvedInputPath, options),
            Boolean(options.refresh),
          ),
        ],
      };
      return result;
    }

    if (options.inPlace) {
      throw new Error(
        '[RegionsData] --in-place is not supported for archives.',
      );
    }

    const loadedInput = loadRegionInput(resolvedInputPath);
    try {
      const outputCityDir = path.join(
        path.resolve(options.outputRoot ?? DEFAULT_LABEL_OUTPUT_ROOT),
        cityCode,
      );
      copyCitySupportFiles(loadedInput.cityDir, outputCityDir);
      const result = placeLabelsForCityDirectory(
        loadedInput.cityDir,
        outputCityDir,
        Boolean(options.refresh),
      );
      if (options.updateIndex) {
        updateOutputIndex(outputCityDir, cityCode, countryCode, result);
      }
      return result;
    } finally {
      loadedInput.cleanup();
    }
  }

  const outputCityDir = options.inPlace
    ? resolvedInputPath
    : path.join(
        path.resolve(options.outputRoot ?? DEFAULT_LABEL_OUTPUT_ROOT),
        cityCode,
      );
  if (!options.inPlace) {
    copyCitySupportFiles(resolvedInputPath, outputCityDir);
  }

  const result = placeLabelsForCityDirectory(
    resolvedInputPath,
    outputCityDir,
    Boolean(options.refresh),
  );
  if (options.updateIndex) {
    updateOutputIndex(outputCityDir, cityCode, countryCode, result);
  }
  return result;
}

export function placeLabelsInFeatureCollection(
  featureCollection: GeoJSON.FeatureCollection,
  refresh = false,
): {
  featureCollection: GeoJSON.FeatureCollection;
  added: number;
  refreshed: number;
  skipped: number;
  nonPolygonFeatures: number;
} {
  let added = 0;
  let refreshed = 0;
  let skipped = 0;
  let nonPolygonFeatures = 0;

  const features = featureCollection.features.map((feature) => {
    if (!isPolygonFeature(feature)) {
      nonPolygonFeatures += 1;
      return feature;
    }

    const existingLat = parseNumber(feature.properties?.LAT);
    const existingLng = parseNumber(feature.properties?.LNG);
    if (!refresh && existingLat !== undefined && existingLng !== undefined) {
      skipped += 1;
      return feature;
    }

    const labelPoint = resolvePrimaryLabelPoint(feature);
    if (existingLat !== undefined && existingLng !== undefined) {
      refreshed += 1;
    } else {
      added += 1;
    }

    return {
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        LAT: labelPoint.lat,
        LNG: labelPoint.lng,
      },
    };
  });

  return {
    featureCollection: {
      ...featureCollection,
      features,
    },
    added,
    refreshed,
    skipped,
    nonPolygonFeatures,
  };
}

function placeLabelsForCityDirectory(
  sourceCityDir: string,
  outputCityDir: string,
  refresh: boolean,
): PlaceRegionLabelsResult {
  const outputs = listDatasetFiles(sourceCityDir).map((datasetFile) =>
    placeLabelsForDatasetFile(
      datasetFile,
      path.join(outputCityDir, datasetFile.fileName),
      refresh,
    ),
  );
  return { outputs };
}

function placeLabelsForDatasetFile(
  datasetFile: RegionDatasetFile,
  outputPath: string,
  refresh: boolean,
): DatasetLabelPlacementResult {
  const featureCollection = loadFeatureCollection(datasetFile.filePath);
  const result = placeLabelsInFeatureCollection(featureCollection, refresh);
  const savedOutput = saveFeatureCollection(
    outputPath,
    result.featureCollection,
    {
      compress: datasetFile.compressed,
    },
  );

  return {
    datasetId: datasetFile.datasetId,
    outputPath: savedOutput.resolvedFilePath,
    added: result.added,
    refreshed: result.refreshed,
    skipped: result.skipped,
    nonPolygonFeatures: result.nonPolygonFeatures,
    featureCount: result.featureCollection.features.length,
    fileSizeMB: savedOutput.fileSizeMB,
  };
}

function updateOutputIndex(
  outputCityDir: string,
  cityCode: string,
  countryCode: string,
  result: PlaceRegionLabelsResult,
): void {
  const indexPath = path.join(path.dirname(outputCityDir), DATA_INDEX_FILE);
  for (const output of result.outputs) {
    assertDatasetRegisteredForCountry(output.datasetId, countryCode);
    updateIndexJson(
      indexPath,
      cityCode,
      buildDatasetMetadata(
        output.datasetId,
        countryCode,
        output.featureCount,
        output.fileSizeMB,
      ),
      countryCode,
    );
  }
}

function requireExplicitCode(value: string, optionName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`[RegionsData] Missing required ${optionName}.`);
  }
  return value.trim();
}

function resolveSingleFileOutputPath(
  inputPath: string,
  options: PlaceRegionLabelsOptions,
): string {
  if (options.inPlace) {
    return inputPath;
  }
  return path.join(
    path.resolve(options.outputRoot ?? DEFAULT_LABEL_OUTPUT_ROOT),
    path.basename(inputPath),
  );
}
