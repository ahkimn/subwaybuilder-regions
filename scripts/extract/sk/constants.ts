import type { SKDatasetId } from './types';

export const SK_COUNTRY_CODE = 'SK';
/** `528595` — the bare obec code. The LAU (`SK0101528595`) is this with the
 *  okres prefix in front, and the pipeline writes BOTH forms. */
export const SK_MUNICIPALITY_CODE_LENGTH = 6;

export const SK_DATASET_ORDER: readonly SKDatasetId[] = [
  'okres_sk',
  'obec_sk',
  'zsj_sk',
];

export const SK_REGIONS_DIR = 'sk/regions';
export const SK_OKRES_FILE = `${SK_REGIONS_DIR}/okres.geojson`;
export const SK_OBCE_FILE = `${SK_REGIONS_DIR}/obce.geojson`;
export const SK_ZSJ_FILE = `${SK_REGIONS_DIR}/zsj.geojson`;

export const SK_SOURCE_ID_PROPERTY = 'SOURCE_ID';
export const SK_NAME_PROPERTY = 'SOURCE_NAME';
export const SK_POPULATION_PROPERTY = 'POPULATION';

/** `okres.geojson` carries its members as a comma-joined string rather than a
 *  JSON array — geopandas writes scalars, and a string round-trips through
 *  GeoJSON without surprises. */
export const SK_MUNICIPALITY_CODES_SEPARATOR = ',';
