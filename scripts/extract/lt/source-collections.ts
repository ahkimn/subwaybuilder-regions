import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import { parseNumber } from '../../utils/cli';
import { mergePolygonFeatures } from '../external/geometry';
import {
  LT_NAME_PROPERTY,
  LT_POPULATION_PROPERTY,
  LT_SOURCE_ID_PROPERTY,
} from './constants';
import { loadLTAdminNames, loadLTChochoSelected } from './context';
import type { LTAdminNameKey, LTBundleContext, LTSourceFeature } from './types';

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function population(properties: GeoJSON.GeoJsonProperties): number {
  return parseNumber(properties?.pop_total) ?? 0;
}

function withProperties(
  feature: LTSourceFeature,
  id: string,
  name: string,
  pop: number,
): LTSourceFeature {
  return {
    ...feature,
    properties: {
      ...(feature.properties ?? {}),
      [LT_SOURCE_ID_PROPERTY]: id,
      [LT_NAME_PROPERTY]: name || id,
      [LT_POPULATION_PROPERTY]: pop,
    },
  };
}

type LTGroup = { name: string; population: number; features: LTSourceFeature[] };

function dissolveChochoByCode(
  context: LTBundleContext,
  codeProperty: string,
  nameKey: LTAdminNameKey,
  fallbackNameKey: LTAdminNameKey | null,
  label: string,
): FeatureCollection<Polygon | MultiPolygon> {
  const names = loadLTAdminNames();
  const groups = new Map<string, LTGroup>();
  for (const feature of loadLTChochoSelected(context).features) {
    const id = text(feature.properties?.[codeProperty]);
    const resolvedName =
      names[nameKey][id] ??
      (fallbackNameKey ? names[fallbackNameKey][id] : undefined) ??
      id;
    const existing = groups.get(id) ?? {
      name: resolvedName,
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
          [LT_SOURCE_ID_PROPERTY]: id,
          [LT_NAME_PROPERTY]: group.name,
          [LT_POPULATION_PROPERTY]: group.population,
        },
        `${label} ${id}`,
      ),
    ),
  };
}

// Finest LT grain: localities (gyvenamosios vietovės). Emitted directly.
export function buildLTGyvenvietesSourceCollection(context: LTBundleContext) {
  return {
    type: 'FeatureCollection' as const,
    features: loadLTChochoSelected(context).features.map((feature) =>
      withProperties(
        feature,
        text(feature.properties?.chocho_key),
        text(feature.properties?.chocho_name),
        population(feature.properties),
      ),
    ),
  };
}

// Elderships (seniūnijos), keyed by 4-digit municipality_code. Whole-city OD
// nodes carry a 2-digit code and fall back to the savivaldybė name.
export function buildLTSeniunijosSourceCollection(context: LTBundleContext) {
  return dissolveChochoByCode(
    context,
    'municipality_code',
    'seniunijos',
    'savivaldybes',
    'LT seniūnija',
  );
}

// Municipalities (savivaldybės), keyed by 2-digit savivaldybe_code.
export function buildLTSavivaldybesSourceCollection(context: LTBundleContext) {
  return dissolveChochoByCode(
    context,
    'savivaldybe_code',
    'savivaldybes',
    null,
    'LT savivaldybė',
  );
}
