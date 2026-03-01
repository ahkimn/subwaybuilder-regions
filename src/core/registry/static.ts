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

export function resolveStaticTemplateCountry(
  city: Pick<City, 'code' | 'country'>,
): string | null {
  if (city.country) {
    const normalizedCountry = normalizeTemplateCountryCode(city.country);
    if (STATIC_TEMPLATES.has(normalizedCountry)) {
      return normalizedCountry;
    }
  }

  const mappedCountry = STATIC_CUSTOM_CITY_COUNTRY_MAPPING[city.code];
  if (!mappedCountry) {
    return null;
  }

  const normalizedMappedCountry = normalizeTemplateCountryCode(mappedCountry);
  if (!STATIC_TEMPLATES.has(normalizedMappedCountry)) {
    return null;
  }

  return normalizedMappedCountry;
}
