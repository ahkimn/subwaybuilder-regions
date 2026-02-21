export type DatasetMetadata = {
  datasetId: string;
  displayName: string;
  unitSingular: string;
  unitPlural: string;
  source: string;
  size: number;
};

export type DatasetIndex = Record<string, DatasetMetadata[]>;

type RegionTypeKey = string;

export type RegionsMetadata = {
  updatedAt: number; // Timestamp of last update, in milliseconds since epoch
  cityCode: string; // City code this dataset is associated with
  datasetMetadata: Record<RegionTypeKey, DatasetIndex>; // Metadata for all available region datasets for this city, keyed by region type
  [k: string]: unknown; // Allow for additional fields in the future
};

export type FeatureCollectionWithMetadata = GeoJSON.FeatureCollection & {
  metadata?: RegionsMetadata;
};
