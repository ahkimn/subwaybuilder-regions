import { z } from 'zod';

import {
  RegionFeatureCollectionSchema,
  RegionFeatureSchema,
} from './feature.js';
import { RegionsManifestSchema } from './manifest.js';

const BASE_ID = 'https://schemas.subwaybuilder-modded.dev/regions';

type JsonSchemaDocument = Record<string, unknown>;

function toDocument(
  schema: z.ZodType,
  meta: { id: string; title: string; description: string },
): JsonSchemaDocument {
  const emitted = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
  }) as JsonSchemaDocument;
  const { $schema, ...body } = emitted;
  return {
    $schema,
    $id: `${BASE_ID}/${meta.id}`,
    title: meta.title,
    description: meta.description,
    ...body,
  };
}

/**
 * Emit the published JSON Schema documents from the Zod source of truth. Keyed by
 * output filename; consumed by both the emit CLI and the drift test so committed
 * `json-schemas/` can never diverge from the Zod definitions.
 */
export function buildJsonSchemaDocuments(): Record<string, JsonSchemaDocument> {
  const manifest = toDocument(RegionsManifestSchema, {
    id: 'manifest.schema.json',
    title: 'Regions map manifest',
    description: 'Contents of .railyard_map/regions/manifest.json.',
  });
  const regionFeature = toDocument(RegionFeatureSchema, {
    id: 'region-feature.schema.json',
    title: 'Regions dataset feature',
    description: 'A single Polygon/MultiPolygon region feature.',
  });
  const regionFeatureCollection = toDocument(RegionFeatureCollectionSchema, {
    id: 'region-feature-collection.schema.json',
    title: 'Regions dataset feature collection',
    description:
      'A regions dataset file: a FeatureCollection of region features.',
  });

  return {
    'manifest.schema.json': manifest,
    'region-feature.schema.json': regionFeature,
    'region-feature-collection.schema.json': regionFeatureCollection,
    'index.json': {
      $comment:
        'Aggregated JSON Schema documents for @subway-builder-modded/regions-schemas.',
      schemas: { manifest, regionFeature, regionFeatureCollection },
    },
  };
}
