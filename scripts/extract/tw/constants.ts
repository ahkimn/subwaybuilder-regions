import type { TWDatasetId } from './types';

export const TW_COUNTRY_CODE = 'TW';

export const TW_PREF_CODE_LENGTH = 5;
export const TW_MUNICIPALITY_CODE_LENGTH = 8;
export const TW_CHOCHO_KEY_LENGTH = 11;

export const TW_CHOCHO_SETS_DIR = 'tw/raw/chocho_sets';
export const TW_MUNICIPALITIES_FILE = 'resources/tw_municipalities.csv';
export const TW_MOI_VILLAGE_BOUNDARIES_DIR =
  'tw/raw/tw_moi_village_boundaries/current/extracted';

export const TW_SOURCE_ID_PROPERTY = 'SOURCE_ID';
export const TW_NAME_ZH_PROPERTY = 'NAME_ZH_SOURCE';
export const TW_NAME_EN_PROPERTY = 'NAME_EN_SOURCE';
export const TW_BILINGUAL_NAME_PROPERTY = 'NAME_BILINGUAL';
export const TW_POPULATION_PROPERTY = 'POPULATION';

export const TW_DATASET_ORDER: readonly TWDatasetId[] = ['township', 'li'];
