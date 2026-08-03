import { z } from 'zod';

/**
 * Per-feature `properties` contract. Keys mirror what the extractor emits and the
 * mod reads at runtime (see docs/regions/POR-railyard-map-regions.md §4). Loose:
 * unknown extras (e.g. NAME_JA, NAME_EN, WITHIN_BBOX) are preserved, not rejected.
 */
export const RegionFeaturePropertiesSchema = z.looseObject({
  // Hard requirement — the stable join key the runtime lookups key off.
  ID: z.union([z.string(), z.number()]),
  // Label-critical: without these the region renders with no label.
  NAME: z.string().min(1),
  LAT: z.number(),
  LNG: z.number(),
  // Read defensively by the runtime (fallbacks/optional).
  DISPLAY_NAME: z.string().min(1).optional(),
  TOTAL_AREA: z.number().nonnegative().optional(),
  AREA_WITHIN_BBOX: z.number().nonnegative().optional(),
  POPULATION: z.number().nonnegative().nullable().optional(),
  UNIT_TYPE: z.string().min(1).optional(),
});
export type RegionFeatureProperties = z.infer<
  typeof RegionFeaturePropertiesSchema
>;

// Coordinates are left loose on purpose: deep ring validation is too costly to run
// per-feature at load time, and the runtime rejects non-polygon geometry itself.
const RegionGeometrySchema = z.looseObject({
  type: z.enum(['Polygon', 'MultiPolygon']),
  coordinates: z.array(z.any()),
});

export const RegionFeatureSchema = z.looseObject({
  type: z.literal('Feature'),
  id: z.union([z.string(), z.number()]).optional(),
  geometry: RegionGeometrySchema,
  properties: RegionFeaturePropertiesSchema,
});
export type RegionFeature = z.infer<typeof RegionFeatureSchema>;

export const RegionFeatureCollectionSchema = z.looseObject({
  type: z.literal('FeatureCollection'),
  features: z.array(RegionFeatureSchema).min(1),
});
export type RegionFeatureCollection = z.infer<
  typeof RegionFeatureCollectionSchema
>;
