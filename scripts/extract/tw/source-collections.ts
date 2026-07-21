import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import {
  applyBilingualOutputNameFields,
  cleanName,
  formatBilingualName,
} from '../bilingual-names';
import { mergePolygonFeatures } from '../external/geometry';
import {
  TW_BILINGUAL_NAME_PROPERTY,
  TW_NAME_EN_PROPERTY,
  TW_NAME_ZH_PROPERTY,
  TW_POPULATION_PROPERTY,
  TW_SOURCE_ID_PROPERTY,
} from './constants';
import {
  cleanTWEnglishName,
  loadTWChochoSet,
  normalizeTWChochoKey,
  normalizeTWMunicipalityCode,
  resolveTWPopulation,
} from './context';
import type { TWBundleContext, TWSourceFeature } from './types';

type TownshipAggregate = {
  municipalityCode: string;
  nameZh: string;
  nameEn: string;
  population: number;
  features: TWSourceFeature[];
};

function withTWRegionProperties(
  feature: TWSourceFeature,
  id: string,
  nameZh: string,
  nameEn: string,
  population: number,
): TWSourceFeature {
  return {
    ...feature,
    properties: {
      ...(feature.properties ?? {}),
      [TW_SOURCE_ID_PROPERTY]: id,
      [TW_NAME_ZH_PROPERTY]: nameZh,
      [TW_NAME_EN_PROPERTY]: nameEn,
      [TW_BILINGUAL_NAME_PROPERTY]: formatBilingualName(nameZh, nameEn),
      [TW_POPULATION_PROPERTY]: population,
    },
  };
}

export function buildTWOutputNameIndex(
  sourceCollection: FeatureCollection<Polygon | MultiPolygon>,
): Map<string, { native: string; en: string }> {
  const index = new Map<string, { native: string; en: string }>();

  for (const feature of sourceCollection.features) {
    const id = cleanName(feature.properties?.[TW_SOURCE_ID_PROPERTY]);
    if (!id) {
      continue;
    }
    index.set(id, {
      native: cleanName(feature.properties?.[TW_NAME_ZH_PROPERTY]),
      en: cleanName(feature.properties?.[TW_NAME_EN_PROPERTY]),
    });
  }

  return index;
}

function loadSelectedTWLi(context: TWBundleContext): TWSourceFeature[] {
  const sourceCollection = loadTWChochoSet(context);
  return sourceCollection.features.filter((feature) => {
    const municipalityCode = normalizeTWMunicipalityCode(
      feature.properties?.municipality_code,
    );
    return municipalityCode && context.municipalityCodes.has(municipalityCode);
  });
}

export function buildTWLiSourceCollection(
  context: TWBundleContext,
): FeatureCollection<Polygon | MultiPolygon> {
  const features: TWSourceFeature[] = [];
  let skippedNonVillageFeatureCount = 0;

  for (const feature of loadSelectedTWLi(context)) {
    const properties = feature.properties ?? {};
    const chochoKey = normalizeTWChochoKey(properties.chocho_key);
    const municipalityCode = normalizeTWMunicipalityCode(
      properties.municipality_code,
    );
    if (!chochoKey) {
      skippedNonVillageFeatureCount += 1;
      continue;
    }
    if (!municipalityCode) {
      throw new Error(
        `[TW] chocho_set feature ${chochoKey} is missing municipality_code.`,
      );
    }

    const nameZh = cleanName(properties.village_name) || chochoKey;
    const nameEn =
      cleanTWEnglishName(properties.village_name_en) ||
      context.villageEnglishNamesByCode.get(chochoKey) ||
      '';

    features.push(
      withTWRegionProperties(
        feature,
        chochoKey,
        nameZh,
        nameEn,
        resolveTWPopulation(properties, `li ${chochoKey}`),
      ),
    );
  }

  if (skippedNonVillageFeatureCount > 0) {
    console.warn(
      `[TW] Skipped ${skippedNonVillageFeatureCount} non-village chocho_set features while building li.`,
    );
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function buildTWTownshipSourceCollection(
  context: TWBundleContext,
): FeatureCollection<Polygon | MultiPolygon> {
  const aggregates = new Map<string, TownshipAggregate>();

  for (const feature of loadSelectedTWLi(context)) {
    const properties = feature.properties ?? {};
    const municipalityCode = normalizeTWMunicipalityCode(
      properties.municipality_code,
    );
    if (!municipalityCode) {
      throw new Error('[TW] chocho_set feature is missing municipality_code.');
    }

    const municipalityNames =
      context.municipalityNamesByCode.get(municipalityCode);
    const nameZh =
      cleanName(properties.township_name) ||
      municipalityNames?.native ||
      municipalityCode;
    const nameEn =
      cleanName(properties.township_name_en) || municipalityNames?.en || '';
    const population = resolveTWPopulation(
      properties,
      `township member ${municipalityCode}`,
    );
    const existing = aggregates.get(municipalityCode);

    if (existing) {
      existing.population += population;
      existing.features.push(feature);
      if (!existing.nameZh && nameZh) {
        existing.nameZh = nameZh;
      }
      if (!existing.nameEn && nameEn) {
        existing.nameEn = nameEn;
      }
    } else {
      aggregates.set(municipalityCode, {
        municipalityCode,
        nameZh,
        nameEn,
        population,
        features: [feature],
      });
    }
  }

  const features = Array.from(aggregates.values())
    .sort((left, right) =>
      left.municipalityCode.localeCompare(right.municipalityCode),
    )
    .map((aggregate) =>
      mergePolygonFeatures(
        aggregate.features,
        {
          [TW_SOURCE_ID_PROPERTY]: aggregate.municipalityCode,
          [TW_NAME_ZH_PROPERTY]: aggregate.nameZh,
          [TW_NAME_EN_PROPERTY]: aggregate.nameEn,
          [TW_BILINGUAL_NAME_PROPERTY]: formatBilingualName(
            aggregate.nameZh,
            aggregate.nameEn,
          ),
          [TW_POPULATION_PROPERTY]: aggregate.population,
        },
        `TW township ${aggregate.municipalityCode}`,
      ),
    );

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function applyTWOutputNameFields(
  features: Array<GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>>,
  namesById: ReadonlyMap<string, { native: string; en: string }>,
): void {
  applyBilingualOutputNameFields(features, namesById, {
    countryCode: 'TW',
    nativePropertyName: 'NAME_ZH',
  });
}
