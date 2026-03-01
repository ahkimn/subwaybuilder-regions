import type { DatasetMetadata } from '../dataset-index';

export type DatasetTemplateMetadata = Omit<
  DatasetMetadata,
  'size' | 'fileSizeMB'
> & {
  existsOnlineSource: boolean; // Indicates if the dataset is fetched from an online source
};

export const DATASET_METADATA_CATALOG: Readonly<
  Record<string, DatasetTemplateMetadata>
> = Object.freeze({
  counties: {
    datasetId: 'counties',
    displayName: 'Counties',
    unitSingular: 'County',
    unitPlural: 'Counties',
    source: 'US Census Bureau',
    existsOnlineSource: true,
  },
  'county-subdivisions': {
    datasetId: 'county-subdivisions',
    displayName: 'County Subdivisions',
    unitSingular: 'County Subdivision',
    unitPlural: 'County Subdivisions',
    source: 'US Census Bureau',
    existsOnlineSource: true,
  },
  zctas: {
    datasetId: 'zctas',
    displayName: 'ZIP Code Tabulation Areas',
    unitSingular: 'ZCTA',
    unitPlural: 'ZCTAs',
    source: 'US Census Bureau',
    existsOnlineSource: true,
  },
  feds: {
    datasetId: 'feds',
    displayName: 'Federal Electoral Districts',
    unitSingular: 'Federal Electoral District',
    unitPlural: 'Federal Electoral Districts',
    source: 'CA Statistics Canada',
    existsOnlineSource: true,
  },
  peds: {
    datasetId: 'peds',
    displayName: 'Provincial Electoral Districts',
    unitSingular: 'Provincial Electoral District',
    unitPlural: 'Provincial Electoral Districts',
    source: 'CA Provincial Electoral Districts',
    existsOnlineSource: false,
  },
  csds: {
    datasetId: 'csds',
    displayName: 'Census Subdivisions',
    unitSingular: 'Census Subdivision',
    unitPlural: 'Census Subdivisions',
    source: 'CA Statistics Canada',
    existsOnlineSource: true,
  },
  fsas: {
    datasetId: 'fsas',
    displayName: 'Forward Sortation Areas',
    unitSingular: 'Forward Sortation Area',
    unitPlural: 'Forward Sortation Areas',
    source: 'CA Statistics Canada',
    existsOnlineSource: true,
  },
  districts: {
    datasetId: 'districts',
    displayName: 'Districts',
    unitSingular: 'District',
    unitPlural: 'Districts',
    source: 'UK ONS',
    existsOnlineSource: true,
  },
  bua: {
    datasetId: 'bua',
    displayName: 'Built-Up Areas',
    unitSingular: 'Built-Up Area',
    unitPlural: 'Built-Up Areas',
    source: 'UK ONS',
    existsOnlineSource: true,
  },
  wards: {
    datasetId: 'wards',
    displayName: 'Electoral Wards',
    unitSingular: 'Electoral Ward',
    unitPlural: 'Electoral Wards',
    source: 'UK ONS',
    existsOnlineSource: true,
  },
});

export const COUNTRY_DATASET_ORDER: Readonly<
  Record<string, readonly string[]>
> = Object.freeze({
  US: ['counties', 'county-subdivisions', 'zctas'],
  CA: ['feds', 'peds', 'csds', 'fsas'],
  GB: ['districts', 'bua', 'wards'],
});

export const CATALOG_STATIC_COUNTRIES = ['US', 'CA', 'GB'] as const;
export type StaticCountryCode = (typeof CATALOG_STATIC_COUNTRIES)[number];

export function isStaticCountryCode(value: string): value is StaticCountryCode {
  return CATALOG_STATIC_COUNTRIES.includes(value as StaticCountryCode);
}

export function normalizeDatasetCountryCode(countryCode: string): string {
  return countryCode.toUpperCase() === 'UK' ? 'GB' : countryCode.toUpperCase();
}

export function resolveCountryDatasetOrder(
  countryCode: string,
): readonly string[] {
  const normalizedCountryCode = normalizeDatasetCountryCode(countryCode);
  return COUNTRY_DATASET_ORDER[normalizedCountryCode] ?? [];
}

export function resolveCountryDatasets(
  countryCode: StaticCountryCode | null,
  opts?: { onlineOnly?: boolean },
): DatasetTemplateMetadata[] {
  if (!countryCode) {
    return [];
  }

  return resolveCountryDatasetOrder(countryCode)
    .map((datasetId) => DATASET_METADATA_CATALOG[datasetId])
    .filter((metadata): metadata is DatasetTemplateMetadata =>
      Boolean(metadata),
    )
    .filter((metadata) =>
      opts?.onlineOnly ? metadata.existsOnlineSource : true,
    );
}

export function buildDatasetTemplatesFromOrder(
  datasetIds: readonly string[],
): readonly DatasetTemplateMetadata[] {
  return datasetIds.map((datasetId) => {
    const metadata = DATASET_METADATA_CATALOG[datasetId];
    if (!metadata) {
      throw new Error(
        `[DatasetCatalog] Missing metadata entry for datasetId: ${datasetId}`,
      );
    }
    return metadata;
  });
}
