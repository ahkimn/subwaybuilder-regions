import { z } from 'zod';

import { REGIONS_MANIFEST_SCHEMA_VERSION } from './constants.js';
import { LayerStyleSchema } from './style.js';

// A filename relative to `.railyard_map/regions/`. Rejects absolute paths, drive
// letters, and parent traversal so a manifest can only point inside the folder.
const RelativeRegionsFile = z
  .string()
  .min(1)
  .refine(
    (p) =>
      !p.startsWith('/') &&
      !p.startsWith('\\') &&
      !p.includes('..') &&
      !/^[a-zA-Z]:/.test(p),
    {
      message:
        "must be a relative path inside .railyard_map/regions (no '..' or absolute paths)",
    },
  );

/** One region dataset a map publishes. Superset of the legacy `data_index.json` entry. */
export const RegionsDatasetEntrySchema = z.object({
  datasetId: z.string().min(1),
  displayName: z.string().min(1),
  unitSingular: z.string().min(1),
  unitPlural: z.string().min(1),
  source: z.string().min(1),
  file: RelativeRegionsFile,
  // Feature count (matches the legacy `size` field). Used as a load sanity-check.
  size: z.number().int().nonnegative(),
  fileSizeMB: z.number().nonnegative().optional(),
  // Optional per-layer render overrides (light/dark); mod defaults fill any gaps.
  style: LayerStyleSchema.optional(),
});
export type RegionsDatasetEntry = z.infer<typeof RegionsDatasetEntrySchema>;

/** Contents of `.railyard_map/regions/manifest.json`. */
export const RegionsManifestSchema = z
  .object({
    schemaVersion: z.literal(REGIONS_MANIFEST_SCHEMA_VERSION),
    // Echoes the map's city code so a misplaced manifest can be detected.
    cityCode: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    // Array order is the display order — no separate `order` field to collide.
    datasets: z.array(RegionsDatasetEntrySchema).min(1),
  })
  .superRefine((manifest, ctx) => {
    const seenIds = new Set<string>();
    const seenFiles = new Set<string>();
    manifest.datasets.forEach((entry, index) => {
      if (seenIds.has(entry.datasetId)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate datasetId "${entry.datasetId}"`,
          path: ['datasets', index, 'datasetId'],
        });
      }
      seenIds.add(entry.datasetId);
      if (seenFiles.has(entry.file)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate file "${entry.file}"`,
          path: ['datasets', index, 'file'],
        });
      }
      seenFiles.add(entry.file);
    });
  });
export type RegionsManifest = z.infer<typeof RegionsManifestSchema>;
