import type { DatasetMetadata } from '@shared/dataset-index';
import {
  buildDatasetTemplatesFromOrder,
  CATALOG_STATIC_COUNTRIES,
  resolveCountryDatasetOrder,
} from '@shared/datasets/catalog';

import type { City } from '../../types/cities';

export type StaticDatasetTemplate = Omit<
  DatasetMetadata,
  'size' | 'fileSizeMB'
>;

const JP_RELEASE_CITY_CODES = [
  'AKJ',
  'AOJ',
  'FKS',
  'FUK',
  'GAJ',
  'HKD',
  'HIJ',
  'ITM',
  'IZO',
  'UKB',
  'KCZ',
  'KIJ',
  'KKJ',
  'KMQ',
  'KOJ',
  'MYJ',
  'NGO',
  'NGS',
  'OKA',
  'OKJ',
  'QUT',
  'SDJ',
  'FSZ',
  'SPK',
  'TAK',
  'TOY',
  'UKY',
] as const;

export const STATIC_CUSTOM_CITY_COUNTRY_MAPPING: Readonly<
  Record<string, string>
> = Object.freeze({
  TOR: 'CA',
  MON: 'CA',
  OTT: 'CA',
  VAN: 'CA',
  CGY: 'CA',
  EDM: 'CA',
  WPG: 'CA',
  QC: 'CA',
  ...Object.fromEntries(
    JP_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'JP']),
  ),
});

export const STATIC_TEMPLATES: Map<string, readonly StaticDatasetTemplate[]> =
  new Map(
    CATALOG_STATIC_COUNTRIES.map((countryCode) => {
      const orderedDatasetIds = resolveCountryDatasetOrder(countryCode);
      return [countryCode, buildDatasetTemplatesFromOrder(orderedDatasetIds)];
    }),
  );

function normalizeTemplateCountryCode(countryCode: string): string {
  if (countryCode === 'UK') {
    return 'GB';
  }
  return countryCode;
}

function normalizeTemplateCityCode(cityCode: string): string {
  const normalizedCode = cityCode.trim().toUpperCase();
  if (/^[A-Z]{3}X$/.test(normalizedCode)) {
    return normalizedCode.slice(0, 3);
  }
  return normalizedCode;
}

export function resolveStaticTemplateCountry(
  city: Pick<City, 'code' | 'country'>,
): string | null {
  if (city.country) {
    const normalizedCountry = normalizeTemplateCountryCode(city.country);
    if (STATIC_TEMPLATES.has(normalizedCountry)) {
      return normalizedCountry;
    }
  }

  const mappedCountry =
    STATIC_CUSTOM_CITY_COUNTRY_MAPPING[normalizeTemplateCityCode(city.code)];
  if (!mappedCountry) {
    return null;
  }

  const normalizedMappedCountry = normalizeTemplateCountryCode(mappedCountry);
  if (!STATIC_TEMPLATES.has(normalizedMappedCountry)) {
    return null;
  }

  return normalizedMappedCountry;
}
