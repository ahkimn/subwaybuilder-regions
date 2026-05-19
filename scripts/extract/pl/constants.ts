import type { PLDatasetId } from './types';

export const PL_COUNTRY_CODE = 'PL';
// Gmina TERYT codes are 7 chars (WW + PP + GG + R, e.g. "1465011").
export const PL_GMINA_CODE_LENGTH = 7;
// Powiat TERYT codes are 4 chars (WW + PP), the first 4 chars of any gmina code.
export const PL_POWIAT_CODE_LENGTH = 4;

export const PL_DATASET_ORDER: readonly PLDatasetId[] = [
  'powiat',
  'gmina',
  'rejon',
];

export const PL_REGIONS_DIR = 'pl/regions';
export const PL_GMINA_FILE = `${PL_REGIONS_DIR}/gmina.geojson`;
export const PL_POWIAT_FILE = `${PL_REGIONS_DIR}/powiat.geojson`;

export const PL_SOURCE_ID_PROPERTY = 'SOURCE_ID';
export const PL_NAME_PROPERTY = 'SOURCE_NAME';
export const PL_POPULATION_PROPERTY = 'POPULATION';
