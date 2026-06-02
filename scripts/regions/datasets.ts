import path from 'path';

import type { DatasetMetadata } from '../../mods/regions/dataset-index';
import {
  DATASET_METADATA_CATALOG,
  resolveCountryDatasetOrder,
} from '../../mods/regions/datasets/catalog';

export type CollaboratorCountryCode = 'PE' | 'CN';

const PE_DATASET_ALIASES: Record<string, string> = {
  provinces: 'pe-provinces',
  province: 'pe-provinces',
  'pe-provinces': 'pe-provinces',
  districts: 'pe-districts',
  district: 'pe-districts',
  'pe-districts': 'pe-districts',
  manzanas: 'pe-manzanas',
  manzana: 'pe-manzanas',
  'pe-manzanas': 'pe-manzanas',
};

const CN_DATASET_ALIASES: Record<string, string> = {
  districts: 'cn-districts',
  district: 'cn-districts',
  'cn-districts': 'cn-districts',
  subdistricts: 'cn-subdistricts',
  subdistrict: 'cn-subdistricts',
  'cn-subdistricts': 'cn-subdistricts',
};

const COUNTRY_ALIASES: Record<
  CollaboratorCountryCode,
  Record<string, string>
> = {
  PE: PE_DATASET_ALIASES,
  CN: CN_DATASET_ALIASES,
};

const CN_CITY_NAME_TO_CODE: Record<string, string> = {
  beijing: 'PEK',
  chengdu: 'CTU',
  chongqing: 'CKG',
  guangzhou: 'CAN',
  shanghai: 'SHA',
  shenzhen: 'SZX',
};

export function normalizeDatasetToken(value: string): string {
  return stripGeoJsonExtension(path.basename(value)).toLowerCase();
}

export function stripGeoJsonExtension(fileName: string): string {
  return fileName.replace(/\.geojson(?:\.gz)?$/i, '');
}

export function isCollaboratorCountryCode(
  value: string,
): value is CollaboratorCountryCode {
  return value === 'PE' || value === 'CN';
}

export function getExpectedDatasetIds(countryCode: string): string[] {
  return [...resolveCountryDatasetOrder(countryCode)];
}

export function resolveCanonicalDatasetId(
  countryCode: string,
  datasetIdOrPath: string,
): string | null {
  const normalizedCountryCode = countryCode.toUpperCase();
  if (!isCollaboratorCountryCode(normalizedCountryCode)) {
    return null;
  }

  const token = normalizeDatasetToken(datasetIdOrPath);
  const aliases = COUNTRY_ALIASES[normalizedCountryCode];
  const exact = aliases[token];
  if (exact) {
    return exact;
  }

  if (normalizedCountryCode === 'CN') {
    if (token.startsWith('districts')) {
      return 'cn-districts';
    }
    if (token.startsWith('subdistricts')) {
      return 'cn-subdistricts';
    }
  }

  return null;
}

export function inferCountryCodeFromDatasetIds(
  datasetIds: readonly string[],
): CollaboratorCountryCode | null {
  if (datasetIds.some((datasetId) => datasetId.startsWith('pe-'))) {
    return 'PE';
  }
  if (datasetIds.some((datasetId) => datasetId.startsWith('cn-'))) {
    return 'CN';
  }
  return null;
}

export function inferChinaCityCodeFromPath(inputPath: string): string | null {
  const token = normalizeDatasetToken(inputPath);
  const matchingName = Object.keys(CN_CITY_NAME_TO_CODE).find((cityName) =>
    token.includes(cityName),
  );
  return matchingName ? CN_CITY_NAME_TO_CODE[matchingName] : null;
}

export function buildDatasetMetadata(
  datasetId: string,
  countryCode: string,
  featureCount: number,
  fileSizeMB?: number,
): DatasetMetadata {
  const metadata = DATASET_METADATA_CATALOG[datasetId];
  if (!metadata) {
    throw new Error(`[RegionsData] Unknown datasetId: ${datasetId}`);
  }

  return {
    datasetId: metadata.datasetId,
    country: countryCode,
    displayName: metadata.displayName,
    unitSingular: metadata.unitSingular,
    unitPlural: metadata.unitPlural,
    source: metadata.source,
    size: featureCount,
    fileSizeMB,
  };
}

export function assertKnownDataset(datasetId: string): void {
  if (!DATASET_METADATA_CATALOG[datasetId]) {
    throw new Error(`[RegionsData] Unknown datasetId: ${datasetId}`);
  }
}
