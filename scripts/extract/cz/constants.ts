import type { CZDatasetId } from './types';

export const CZ_COUNTRY_CODE = 'CZ';
export const CZ_MUNICIPALITY_CODE_LENGTH = 6;
export const CZ_DATASET_ORDER: readonly CZDatasetId[] = [
  'okres',
  'obce',
  'zsj',
];

export const CZ_REGIONS_DIR = 'cz/regions';
export const CZ_OBCE_FILE = `${CZ_REGIONS_DIR}/obce.geojson`;
export const CZ_OKRES_FILE = `${CZ_REGIONS_DIR}/okres.geojson`;
export const CZ_ZSJ_DIL_NAMES_FILE = `${CZ_REGIONS_DIR}/zsj_dil_names.csv`;

export const CZ_SOURCE_ID_PROPERTY = 'SOURCE_ID';
export const CZ_NAME_PROPERTY = 'SOURCE_NAME';
export const CZ_POPULATION_PROPERTY = 'POPULATION';
