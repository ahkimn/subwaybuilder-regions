import type { DatasetMetadata } from '@shared/dataset-index';

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

export const STATIC_BASE_GAME_CITY_CODES = [
  'ATL',
  'AUS',
  'BAL',
  'BIR',
  'BOS',
  'CHI',
  'CIN',
  'CLE',
  'CLT',
  'COL',
  'DAL',
  'DC',
  'DEN',
  'DET',
  'HNL',
  'HOU',
  'IND',
  'LIV',
  'LON',
  'MAN',
  'MIA',
  'MKE',
  'MSP',
  'NEW',
  'NYC',
  'PDX',
  'PHL',
  'PHX',
  'PIT',
  'SAN',
  'SEA',
  'SF',
  'SLC',
  'STL',
] as const;

export type StaticBaseGameCityCode =
  (typeof STATIC_BASE_GAME_CITY_CODES)[number];

export const STATIC_BASE_GAME_DATASET_TEMPLATES: Record<
  StaticBaseGameCityCode,
  readonly StaticDatasetTemplate[]
> = {
  ATL: US_DATASET_TEMPLATES,
  AUS: US_DATASET_TEMPLATES,
  BAL: US_DATASET_TEMPLATES,
  BIR: GB_DATASET_TEMPLATES,
  BOS: US_DATASET_TEMPLATES,
  CHI: US_DATASET_TEMPLATES,
  CIN: US_DATASET_TEMPLATES,
  CLE: US_DATASET_TEMPLATES,
  CLT: US_DATASET_TEMPLATES,
  COL: US_DATASET_TEMPLATES,
  DAL: US_DATASET_TEMPLATES,
  DC: US_DATASET_TEMPLATES,
  DEN: US_DATASET_TEMPLATES,
  DET: US_DATASET_TEMPLATES,
  HNL: US_DATASET_TEMPLATES,
  HOU: US_DATASET_TEMPLATES,
  IND: US_DATASET_TEMPLATES,
  LIV: GB_DATASET_TEMPLATES,
  LON: GB_DATASET_TEMPLATES,
  MAN: GB_DATASET_TEMPLATES,
  MIA: US_DATASET_TEMPLATES,
  MKE: US_DATASET_TEMPLATES,
  MSP: US_DATASET_TEMPLATES,
  NEW: GB_DATASET_TEMPLATES,
  NYC: US_DATASET_TEMPLATES,
  PDX: US_DATASET_TEMPLATES,
  PHL: US_DATASET_TEMPLATES,
  PHX: US_DATASET_TEMPLATES,
  PIT: US_DATASET_TEMPLATES,
  SAN: US_DATASET_TEMPLATES,
  SEA: US_DATASET_TEMPLATES,
  SF: US_DATASET_TEMPLATES,
  SLC: US_DATASET_TEMPLATES,
  STL: US_DATASET_TEMPLATES,
};

export async function resolveLocalModsDataRoot(): Promise<string> {
  type ElectronModsAPI = {
    getModsFolder?: () => Promise<string>;
  };

  const electronApi = window.electron as ElectronModsAPI | undefined;
  if (!electronApi?.getModsFolder) {
    throw new Error('[Regions] Missing electron.getModsFolder API');
  }

  const modsDir = (await electronApi.getModsFolder()).replace(/\\/g, '/');
  return `${modsDir}/regions/data`;
}

export function buildLocalDatasetUrl(
  localModsDataRoot: string,
  cityCode: string,
  datasetId: string,
): string {
  return encodeURI(
    `file:///${localModsDataRoot}/${cityCode}/${datasetId}.geojson`,
  );
}

export async function getFeatureCount(
  dataPath: string,
): Promise<number | null> {
  try {
    const response = await fetch(dataPath);
    if (!response.ok) {
      return null;
    }

    const raw = await response.text();
    let geoJson: GeoJSON.FeatureCollection;
    try {
      geoJson = JSON.parse(raw) as GeoJSON.FeatureCollection;
    } catch (error) {
      const preview = raw.slice(0, 180).replace(/\s+/g, ' ');
      console.error(
        `[Regions] Failed to parse fallback GeoJSON at ${dataPath}. Preview: ${preview}`,
        error,
      );
      return null;
    }

    if (!Array.isArray(geoJson.features)) {
      console.warn(
        `[Regions] Invalid fallback GeoJSON (missing features array) at ${dataPath}`,
      );
      return null;
    }

    return geoJson.features.length;
  } catch {
    return null;
  }
}
