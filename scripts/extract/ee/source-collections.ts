import type { Feature, MultiPolygon, Polygon } from 'geojson';

import { parseNumber } from '../../utils/cli';
import { mergePolygonFeatures } from '../external/geometry';
import {
  EE_NAME_PROPERTY,
  EE_POPULATION_PROPERTY,
  EE_SOURCE_ID_PROPERTY,
} from './constants';
import { loadEEChochoSelected, loadEEOmavalitsusedSelected } from './context';
import type { EEBundleContext } from './types';

type EEFeature = Feature<Polygon | MultiPolygon>;

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function population(properties: GeoJSON.GeoJsonProperties): number {
  return parseNumber(properties?.pop_total) ?? 0;
}

function withProperties(
  feature: EEFeature,
  id: string,
  name: string,
  pop: number,
): EEFeature {
  return {
    ...feature,
    properties: {
      ...(feature.properties ?? {}),
      [EE_SOURCE_ID_PROPERTY]: id,
      [EE_NAME_PROPERTY]: name || id,
      [EE_POPULATION_PROPERTY]: pop,
    },
  };
}

export function buildEEAsustusuksusedSourceCollection(
  context: EEBundleContext,
) {
  return {
    type: 'FeatureCollection' as const,
    features: loadEEChochoSelected(context).features.map((feature) =>
      withProperties(
        feature,
        text(feature.properties?.chocho_key),
        text(feature.properties?.chocho_name) ||
          text(feature.properties?.ANIMI),
        population(feature.properties),
      ),
    ),
  };
}

export function buildEEOmavalitsusedSourceCollection(context: EEBundleContext) {
  return {
    type: 'FeatureCollection' as const,
    features: loadEEOmavalitsusedSelected(context).features.map((feature) =>
      withProperties(
        feature,
        text(feature.properties?.region_key),
        text(feature.properties?.region_name),
        population(feature.properties),
      ),
    ),
  };
}

export function buildEEMaakondSourceCollection(context: EEBundleContext) {
  const groups = new Map<
    string,
    { name: string; population: number; features: EEFeature[] }
  >();
  for (const feature of loadEEOmavalitsusedSelected(context).features) {
    const id = text(feature.properties?.pref_code);
    const existing = groups.get(id) ?? {
      name: text(feature.properties?.pref_name) || id,
      population: 0,
      features: [],
    };
    existing.population += population(feature.properties);
    existing.features.push(feature);
    groups.set(id, existing);
  }
  return {
    type: 'FeatureCollection' as const,
    features: Array.from(groups.entries()).map(([id, group]) =>
      mergePolygonFeatures(
        group.features,
        {
          [EE_SOURCE_ID_PROPERTY]: id,
          [EE_NAME_PROPERTY]: group.name,
          [EE_POPULATION_PROPERTY]: group.population,
        },
        `EE maakond ${id}`,
      ),
    ),
  };
}
