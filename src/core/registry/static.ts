import type { DatasetMetadata } from '@shared/dataset-index';

import type { City } from '../../types/cities';

export type StaticDatasetTemplate = Omit<DatasetMetadata, 'size'>;

const US_DATASET_TEMPLATES: readonly StaticDatasetTemplate[] = [
  {
    datasetId: 'counties',
    displayName: 'Counties',
    unitSingular: 'County',
    unitPlural: 'Counties',
    source: 'US Census Bureau',
  },
  {
    datasetId: 'county-subdivisions',
    displayName: 'County Subdivisions',
    unitSingular: 'County Subdivision',
    unitPlural: 'County Subdivisions',
    source: 'US Census Bureau',
  },
  {
    datasetId: 'zctas',
    displayName: 'ZIP Code Tabulation Areas',
    unitSingular: 'ZCTA',
    unitPlural: 'ZCTAs',
    source: 'US Census Bureau',
  },
];

const GB_DATASET_TEMPLATES: readonly StaticDatasetTemplate[] = [
  {
    datasetId: 'districts',
    displayName: 'Districts',
    unitSingular: 'District',
    unitPlural: 'Districts',
    source: 'UK ONS',
  },
  {
    datasetId: 'bua',
    displayName: 'Built-Up Areas',
    unitSingular: 'Built-Up Area',
    unitPlural: 'Built-Up Areas',
    source: 'UK ONS',
  },
  {
    datasetId: 'wards',
    displayName: 'Electoral Wards',
    unitSingular: 'Electoral Ward',
    unitPlural: 'Electoral Wards',
    source: 'UK ONS',
  },
];

const CA_DATASET_TEMPLATES: readonly StaticDatasetTemplate[] = [
  {
    datasetId: 'feds',
    displayName: 'Federal Electoral Districts',
    unitSingular: 'Federal Electoral District',
    unitPlural: 'Federal Electoral Districts',
    source: 'CA Statistics Canada',
  },
  {
    datasetId: 'peds',
    displayName: 'Provincial Electoral Districts',
    unitSingular: 'Provincial Electoral District',
    unitPlural: 'Provincial Electoral Districts',
    source: 'CA Provincial Electoral Districts',
  },
  {
    datasetId: 'csds',
    displayName: 'Census Subdivisions',
    unitSingular: 'Census Subdivision',
    unitPlural: 'Census Subdivisions',
    source: 'CA Statistics Canada',
  },
  {
    datasetId: 'fsas',
    displayName: 'Forward Sortation Areas',
    unitSingular: 'Forward Sortation Area',
    unitPlural: 'Forward Sortation Areas',
    source: 'CA Statistics Canada',
  },
];

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
  new Map([
    ['US', US_DATASET_TEMPLATES],
    ['UK', GB_DATASET_TEMPLATES], // Game uses UK internally while GB is used as the country code despite GB being the ISO code
    ['CA', CA_DATASET_TEMPLATES],
  ]);

function normalizeTemplateCountryCode(countryCode: string): string {
  if (countryCode === 'GB') {
    return 'UK';
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
