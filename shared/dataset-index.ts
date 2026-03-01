import { z } from 'zod';

import type { DatasetOrigin } from '../src/core/domain';

export type DatasetMetadata = {
  datasetId: string;
  country?: string; // Optional due to backwards compatibility (introduced in 0.4.1)
  displayName: string;
  unitSingular: string;
  unitPlural: string;
  source: string;
  size: number;
  fileSizeMB?: number; // Optional due to served datasets where size is not a constraint
};

export type DatasetIndex = Record<string, DatasetMetadata[]>;
export type RegistryOrigin = Extract<
  // We do not want to persist served dataset in registry cache as they are not related to actual files within the mod or game directory
  DatasetOrigin,
  'static' | 'dynamic' | 'user'
>;

export type RegistryCacheEntry = DatasetMetadata & {
  cityCode: string;
  dataPath: string;
  isPresent: boolean;
  origin: RegistryOrigin;
  compressed: boolean;
};

export const StaticRegistryCacheEntrySchema = z.object({
  cityCode: z.string(),
  datasetId: z.string(),
  country: z.string().optional(),
  displayName: z.string(),
  unitSingular: z.string(),
  unitPlural: z.string(),
  source: z.string(),
  size: z.number(),
  dataPath: z.string(),
  isPresent: z.boolean(),
  origin: z.enum(['static', 'dynamic', 'user']),
  fileSizeMB: z.number().optional(),
  compressed: z.boolean(),
});

export type RegionsRegistryCache = {
  updatedAt: number;
  entries: RegistryCacheEntry[];
};

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
