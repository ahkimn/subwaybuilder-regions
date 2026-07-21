import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import { parseNumber } from '../../utils/cli';
import {
  applyBilingualOutputNameFields,
  cleanName,
  formatBilingualName,
} from '../bilingual-names';
import { mergePolygonFeatures } from '../external/geometry';
import {
  UA_BILINGUAL_NAME_PROPERTY,
  UA_NAME_EN_PROPERTY,
  UA_NAME_UK_PROPERTY,
  UA_POPULATION_PROPERTY,
  UA_SOURCE_ID_PROPERTY,
} from './constants';
import { loadUAChochoSelected } from './context';
import type { UABundleContext, UASourceFeature } from './types';

type NameParts = { native: string; en: string };
type Aggregate = NameParts & {
  population: number;
  features: UASourceFeature[];
};

const UKRAINIAN_TRANSLITERATION: Readonly<Record<string, string>> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ye',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'yi',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'yu',
  я: 'ya',
  "'": '',
  '’': '',
};

function population(properties: GeoJSON.GeoJsonProperties): number {
  return parseNumber(properties?.pop_total) ?? 0;
}

function transliterateUkrainian(value: string): string {
  const transliterated = Array.from(value)
    .map((character) => {
      const lower = character.toLowerCase();
      const mapped = UKRAINIAN_TRANSLITERATION[lower];
      if (mapped === undefined) {
        return character;
      }
      return character === lower
        ? mapped
        : mapped.charAt(0).toUpperCase() + mapped.slice(1);
    })
    .join('');
  return transliterated.replace(/\s+raion$/i, ' district');
}

function resolveNames(nativeValue: unknown, englishValue: unknown): NameParts {
  const native = cleanName(nativeValue);
  return {
    native,
    en: cleanName(englishValue) || transliterateUkrainian(native),
  };
}

function ruralNames(properties: GeoJSON.GeoJsonProperties): NameParts {
  const hromadaNames = resolveNames(
    properties?.municipality_name,
    properties?.municipality_name_en,
  );
  return {
    native: `${hromadaNames.native} (сільські околиці)`,
    en: `${hromadaNames.en} rural area`,
  };
}

function withProperties(
  feature: UASourceFeature,
  id: string,
  names: NameParts,
  pop = population(feature.properties),
): UASourceFeature {
  return {
    ...feature,
    properties: {
      ...(feature.properties ?? {}),
      [UA_SOURCE_ID_PROPERTY]: id,
      [UA_NAME_UK_PROPERTY]: names.native,
      [UA_NAME_EN_PROPERTY]: names.en,
      [UA_BILINGUAL_NAME_PROPERTY]: formatBilingualName(names.native, names.en),
      [UA_POPULATION_PROPERTY]: pop,
    },
  };
}

function aggregateFeature(id: string, group: Aggregate, label: string) {
  return mergePolygonFeatures(
    group.features,
    {
      [UA_SOURCE_ID_PROPERTY]: id,
      [UA_NAME_UK_PROPERTY]: group.native,
      [UA_NAME_EN_PROPERTY]: group.en,
      [UA_BILINGUAL_NAME_PROPERTY]: formatBilingualName(group.native, group.en),
      [UA_POPULATION_PROPERTY]: group.population,
    },
    label,
  );
}

export function buildUANaseleniPunktySourceCollection(
  context: UABundleContext,
) {
  const features = loadUAChochoSelected(context).features.map((feature) => {
    const id = cleanName(feature.properties?.chocho_key);
    const names = id.endsWith('999')
      ? ruralNames(feature.properties)
      : resolveNames(
          cleanName(feature.properties?.chocho_name) || id,
          feature.properties?.chocho_name_en,
        );
    return withProperties(feature, id, names);
  });
  return { type: 'FeatureCollection' as const, features };
}

export function buildUAHromadasSourceCollection(context: UABundleContext) {
  const groups = new Map<string, UASourceFeature[]>();
  for (const feature of loadUAChochoSelected(context).features) {
    const key = cleanName(feature.properties?.chocho_key);
    const id = key.slice(0, 9);
    groups.set(id, [...(groups.get(id) ?? []), feature]);
  }

  const features: UASourceFeature[] = [];
  for (const [id, members] of groups) {
    const districts = members.filter((feature) =>
      /D\d{2}$/.test(cleanName(feature.properties?.chocho_key)),
    );
    const remaining = members.filter((feature) => !districts.includes(feature));
    if (districts.length === 0) {
      const first = members[0].properties ?? {};
      features.push(
        aggregateFeature(
          id,
          {
            ...resolveNames(
              cleanName(first.municipality_name) || id,
              first.municipality_name_en,
            ),
            population: members.reduce(
              (sum, feature) => sum + population(feature.properties),
              0,
            ),
            features: members,
          },
          `UA hromada ${id}`,
        ),
      );
      continue;
    }
    features.push(
      ...districts.map((feature) =>
        withProperties(
          feature,
          cleanName(feature.properties?.chocho_key),
          resolveNames(
            feature.properties?.chocho_name,
            feature.properties?.chocho_name_en,
          ),
        ),
      ),
    );
    if (remaining.length > 0) {
      const names = ruralNames(remaining[0].properties);
      features.push(
        aggregateFeature(
          `${id}R`,
          {
            ...names,
            population: remaining.reduce(
              (sum, feature) => sum + population(feature.properties),
              0,
            ),
            features: remaining,
          },
          `UA hromada rural area ${id}`,
        ),
      );
    }
  }
  return { type: 'FeatureCollection' as const, features };
}

export function buildUARaionsSourceCollection(context: UABundleContext) {
  const groups = new Map<string, Aggregate>();
  for (const feature of loadUAChochoSelected(context).features) {
    const id = cleanName(feature.properties?.raion_code);
    const current = groups.get(id) ?? {
      ...resolveNames(
        cleanName(feature.properties?.raion_name_uk) || id,
        feature.properties?.raion_name_en,
      ),
      population: 0,
      features: [],
    };
    current.population += population(feature.properties);
    current.features.push(feature);
    groups.set(id, current);
  }
  return {
    type: 'FeatureCollection' as const,
    features: Array.from(groups.entries()).map(([id, group]) =>
      aggregateFeature(id, group, `UA raion ${id}`),
    ),
  };
}

export function buildUAOutputNameIndex(
  collection: FeatureCollection<Polygon | MultiPolygon>,
): Map<string, NameParts> {
  return new Map(
    collection.features.map((feature) => [
      cleanName(feature.properties?.[UA_SOURCE_ID_PROPERTY]),
      {
        native: cleanName(feature.properties?.[UA_NAME_UK_PROPERTY]),
        en: cleanName(feature.properties?.[UA_NAME_EN_PROPERTY]),
      },
    ]),
  );
}

export function applyUAOutputNameFields(
  features: Array<GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>>,
  namesById: ReadonlyMap<string, NameParts>,
): void {
  applyBilingualOutputNameFields(features, namesById, {
    countryCode: 'UA',
    nativePropertyName: 'NAME_UK',
  });
}
