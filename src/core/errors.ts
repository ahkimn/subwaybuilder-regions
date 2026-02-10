import type { Feature, GeoJsonProperties, Geometry } from 'geojson';

// TODO (Issue 3): Let's use custom error classes catch them centrally
export class DatasetMissingDataLayerError extends Error {
  constructor(datasetId: string, layerType: string) {
    super(`Dataset ${datasetId} is missing required data ${layerType}`);
    this.name = 'DatasetMissingDataLayerError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DatasetMissingFeatureError extends Error {
  constructor(datasetId: string, layerType: string, featureId: string | number) {
    super(`Dataset ${datasetId} is missing required data for feature ${featureId} in ${layerType}`);
    this.name = 'DatasetMissingFeatureError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DatasetInvalidFeatureTypeError extends Error {
  constructor(datasetId: string, feature: Feature<Geometry, GeoJsonProperties>) {
    super(`Feature ${feature.id} in dataset ${datasetId} is invalid. Feature type: ${feature.geometry.type} is not supported.`);
    this.name = 'DatasetInvalidFeatureTypeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// TODO (Issue 3): Let's use custom error classes catch them centrally
export class RegistryMissingDatasetError extends Error {
  constructor(datasetId: string) {
    super(`Dataset ${datasetId} does not exist in the registry`);
    this.name = 'RegistryMissingDatasetError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RegistryMissingIndexError extends Error {
  constructor(indexFile: string, url: string) {
    super(`Dataset index could not be fetched from ${url}/${indexFile}`);
    this.name = 'RegistryMissingIndexError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
