import { cleanCoords } from '@turf/clean-coords';
import * as turf from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

export type PolygonFeature = Feature<Polygon | MultiPolygon>;

export function mergePolygonFeatures(
  features: readonly PolygonFeature[],
  properties: GeoJSON.GeoJsonProperties,
  label: string,
): PolygonFeature {
  if (features.length === 0) {
    throw new Error(`Cannot merge an empty polygon group: ${label}.`);
  }
  if (features.length === 1) {
    const cloned = turf.clone(features[0]) as PolygonFeature;
    cloned.properties = properties;
    return cloned;
  }

  let merged: PolygonFeature | null = null;
  try {
    merged = turf.union(turf.featureCollection([...features]), {
      properties,
    }) as PolygonFeature | null;
  } catch (error) {
    console.warn(
      `Union failed for ${label}; retrying cleaned coordinates.`,
      error,
    );
    const normalized = features.map((feature) =>
      turf.truncate(cleanCoords(feature), {
        precision: 7,
        coordinates: 2,
        mutate: false,
      }),
    ) as PolygonFeature[];
    merged = turf.union(turf.featureCollection(normalized), {
      properties,
    }) as PolygonFeature | null;
  }

  if (merged) {
    merged.properties = properties;
    return merged;
  }

  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'MultiPolygon',
      coordinates: features.flatMap((feature) =>
        feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates,
      ),
    },
  };
}
