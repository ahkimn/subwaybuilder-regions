import type { DatasetMetadata } from '../../../shared/dataset-index';

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

export const STATIC_TEMPLATES: Map<string, readonly StaticDatasetTemplate[]> =
  new Map([
    ['US', US_DATASET_TEMPLATES],
    ['UK', GB_DATASET_TEMPLATES], // Game uses UK internally while GB is used as the country code despite GB being the ISO code
  ]);
