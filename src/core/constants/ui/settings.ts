
export const REGIONS_SETTINGS_FETCH_SECTION_ID = 'settings-fetch-section';
export const REGIONS_SETTINGS_FETCH_CITY_FIELD_ID = 'settings-fetch-city-field';
export const REGIONS_SETTINGS_FETCH_COUNTRY_FIELD_ID = 'settings-fetch-country-field';
export const REGIONS_SETTINGS_FETCH_DATASETS_FIELD_ID = 'settings-fetch-datasets-field';
export const REGIONS_SETTINGS_FETCH_BBOX_FIELD_ID = 'settings-fetch-bbox-field';
export const REGIONS_SETTINGS_FETCH_COMMAND_FIELD_ID = 'settings-fetch-command-field';
export const REGIONS_SETTINGS_FETCH_CITY_WARNING_ID = 'settings-fetch-city-warning';
export const REGIONS_SETTINGS_FETCH_COUNTRY_WARNING_ID = 'settings-fetch-country-warning';
export const REGIONS_SETTINGS_FETCH_DATASETS_WARNING_ID = 'settings-fetch-datasets-warning';
export const REGIONS_SETTINGS_FETCH_COMMAND_WARNING_ID = 'settings-fetch-command-warning';
export const REGIONS_SETTINGS_FETCH_COPY_BUTTON_ID = 'settings-fetch-copy-button';
export const REGIONS_SETTINGS_FETCH_OPEN_MOD_FOLDER_BUTTON_ID = 'settings-fetch-open-mod-folder-button';
export const REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID = 'settings-fetch-validate-button';
export const REGIONS_SETTINGS_FETCH_STATUS_ID = 'settings-fetch-status';
export const REGIONS_SETTINGS_FETCH_DATASET_CARD_ID_PREFIX = 'settings-fetch-dataset-card';

export function regionsFetchDatasetCardId(datasetId: string): string {
  return `${REGIONS_SETTINGS_FETCH_DATASET_CARD_ID_PREFIX}-${datasetId}`;
}
