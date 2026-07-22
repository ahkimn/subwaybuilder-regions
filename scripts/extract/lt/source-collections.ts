import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import { parseNumber } from '../../utils/cli';
import { mergePolygonFeatures } from '../external/geometry';
import {
  LT_NAME_PROPERTY,
  LT_POPULATION_PROPERTY,
  LT_SOURCE_ID_PROPERTY,
} from './constants';
import { loadLTAdminNames, loadLTChochoSelected } from './context';
import type {
  LTAdminNameKey,
  LTAdminNames,
  LTBundleContext,
  LTSourceFeature,
} from './types';

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

type LTGroup = {
  name: string;
  population: number;
  features: LTSourceFeature[];
};

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

type LTLocalityEntry = {
  feature: LTSourceFeature;
  key: string;
  base: string;
  qualifier: string | null;
  population: number;
};

// Resolve the admin unit a locality sits in, used both as a name fallback (for
// the nameless cadastral residuals jp-data emits) and as a duplicate-name
// qualifier: the 4-digit municipality_code is the seniūnija; whole-city OD
// nodes carry a 2-digit code and fall back to the savivaldybė.
function resolveLTQualifier(
  names: LTAdminNames,
  properties: GeoJSON.GeoJsonProperties,
): string | null {
  const municipalityCode = text(properties?.municipality_code);
  const savivaldybeCode = text(properties?.savivaldybe_code);
  return (
    names.seniunijos[municipalityCode] ??
    names.savivaldybes[savivaldybeCode] ??
    null
  );
}

// Give every locality a non-empty, unique display name. jp-data's chocho grain
// (kept as the finest display grain) leaves two naming defects: nameless
// cadastral residuals, and many features sharing a parent-settlement name
// (e.g. a city's cadastral blokai). We fill blanks from the admin hierarchy,
// then de-duplicate: same-named localities in different seniūnijos are
// qualified by seniūnija; any that still collide (same admin unit, e.g. one
// city's blokai) get a deterministic ordinal (population desc, key tiebreak).
function assignUniqueLocalityNames(
  entries: LTLocalityEntry[],
): Map<string, string> {
  const resolved = new Map<string, string>();

  const assignOrdinals = (group: LTLocalityEntry[], label: string): void => {
    if (group.length === 1) {
      resolved.set(group[0].key, label);
      return;
    }
    [...group]
      .sort((a, b) => b.population - a.population || a.key.localeCompare(b.key))
      .forEach((entry, index) => {
        resolved.set(entry.key, `${label} (${index + 1})`);
      });
  };

  const byBase = new Map<string, LTLocalityEntry[]>();
  for (const entry of entries) {
    const group = byBase.get(entry.base) ?? [];
    group.push(entry);
    byBase.set(entry.base, group);
  }

  for (const [base, group] of byBase) {
    const distinctQualifiers = new Set(group.map((e) => e.qualifier ?? ''));
    if (distinctQualifiers.size <= 1) {
      // Qualifier can't separate them (single admin unit) → ordinal on base.
      assignOrdinals(group, base);
      continue;
    }
    // Qualifier distinguishes at least some; sub-group by it, ordinal within.
    const byQualifier = new Map<string, LTLocalityEntry[]>();
    for (const entry of group) {
      const qualifier = entry.qualifier ?? '';
      const sub = byQualifier.get(qualifier) ?? [];
      sub.push(entry);
      byQualifier.set(qualifier, sub);
    }
    for (const [qualifier, sub] of byQualifier) {
      assignOrdinals(sub, qualifier ? `${base} (${qualifier})` : base);
    }
  }
  return resolved;
}

// Finest LT grain: localities (gyvenamosios vietovės). Kept at the jp-data
// chocho grain, but every feature is guaranteed a non-empty, unique name.
export function buildLTGyvenvietesSourceCollection(context: LTBundleContext) {
  const names = loadLTAdminNames();
  const entries: LTLocalityEntry[] = loadLTChochoSelected(context).features.map(
    (feature) => {
      const properties = feature.properties ?? {};
      const qualifier = resolveLTQualifier(names, properties);
      return {
        feature,
        key: text(properties.chocho_key),
        base:
          text(properties.chocho_name) ||
          qualifier ||
          text(properties.chocho_key),
        qualifier,
        population: population(properties),
      };
    },
  );
  const uniqueNames = assignUniqueLocalityNames(entries);
  return {
    type: 'FeatureCollection' as const,
    features: entries.map((entry) =>
      withProperties(
        entry.feature,
        entry.key,
        uniqueNames.get(entry.key) ?? entry.base,
        entry.population,
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
