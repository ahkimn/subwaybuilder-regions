import { z } from 'zod';

/**
 * Per-feature `properties` contract, grounded in what the extractor emits and what
 * the mod reads at runtime. Loose: unknown extras are preserved, not rejected — so
 * legacy per-country name keys still validate (see NAME_NATIVE below).
 */
export const RegionFeaturePropertiesSchema = z.looseObject({
  // Hard requirement — the stable join key the runtime lookups key off.
  ID: z.union([z.string(), z.number()]),
  // Label-critical: without these the region renders with no label. NAME is the
  // display string (may be a native\nromanized two-line label).
  NAME: z.string().min(1),
  LAT: z.number(),
  LNG: z.number(),
  // Read defensively by the runtime (fallbacks/optional).
  DISPLAY_NAME: z.string().min(1).optional(),
  TOTAL_AREA: z.number().nonnegative().optional(),
  AREA_WITHIN_BBOX: z.number().nonnegative().optional(),
  POPULATION: z.number().nonnegative().nullable().optional(),
  UNIT_TYPE: z.string().min(1).optional(),
  // Country-agnostic native name in the region's own script, unlocalized — e.g.
  // Cyrillic for UA, Traditional Chinese for TW, Japanese for JP. This is the
  // canonical go-forward field; the extractor historically emitted country-specific
  // keys instead (NAME_JA / NAME_ZH / NAME_UK), which remain valid as loose
  // passthrough so existing installs keep validating.
  NAME_NATIVE: z.string().min(1).optional(),
  // Romanized / Latin-script name (what the extractor emits as NAME_EN).
  NAME_EN: z.string().min(1).optional(),
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
