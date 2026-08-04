import type { z } from 'zod';

import {
  RegionFeatureCollectionSchema,
  type RegionFeatureCollection,
} from './feature.js';
import { RegionsManifestSchema, type RegionsManifest } from './manifest.js';

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
}

/** Validate a parsed `.railyard_map/regions/manifest.json`, returning friendly errors. */
export function validateRegionsManifest(
  input: unknown,
): ValidationResult<RegionsManifest> {
  const parsed = RegionsManifestSchema.safeParse(input);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, errors: formatIssues(parsed.error) };
}

/** Validate a parsed regions dataset FeatureCollection (used by the generator). */
export function validateRegionsFeatureCollection(
  input: unknown,
): ValidationResult<RegionFeatureCollection> {
  const parsed = RegionFeatureCollectionSchema.safeParse(input);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, errors: formatIssues(parsed.error) };
}
