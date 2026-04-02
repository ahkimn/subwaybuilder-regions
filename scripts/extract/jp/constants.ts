import type { JPDatasetId } from './types';

export const N03_BOUNDARY_FILE = 'N03-20240101.geojson.gz';
export const NEIGHBORHOOD_BOUNDARY_DIR = 'neighborhood7_boundaries';
export const NEIGHBORHOOD_ZIP_TEMPLATE = 'A002005212020DDSWC{prefCode}.zip';
export const SOURCE_ID_PROPERTY = 'SOURCE_ID';
export const BILINGUAL_NAME_PROPERTY = 'NAME_BILINGUAL';
export const JAPANESE_NAME_PROPERTY = 'NAME_JA_SOURCE';
export const ENGLISH_NAME_PROPERTY = 'NAME_EN_SOURCE';
export const POPULATION_PROPERTY = 'POPULATION';
export const JP_DATASET_ORDER: readonly JPDatasetId[] = ['shichouson', 'ooaza'];
