export const PRESET_UNIT_LABELS: Record<string, { singular: string; plural: string }> = {
  'districts': { singular: 'District', plural: 'Districts' }, // GB local authority districts
  'bua': { singular: 'BUA', plural: 'BUAs' }, // GB built-up areas
  'wards': { singular: 'Ward', plural: 'Wards' }, // GB electoral wards
  'counties': { singular: 'County', plural: 'Counties' },
  'county-subdivisions': { singular: 'County Subdivision', plural: 'County Subdivisions' },
  'zctas': { singular: 'ZCTA', plural: 'ZCTAs' },
}

// For non-preset datasets or custom user datasets
export const DEFAULT_UNIT_LABELS = { singular: 'Region', plural: 'Regions' };

export const SOURCE_PREFIX = 'regions-src';
export const LAYER_PREFIX = 'regions-layer';
/*
For certain region layers (e.x. neighborhoods), not all demand points will be assigned to a region.

This constant can be used as a key in the demand data maps to track the demand from these unassigned points.
*/

export const UNASSIGNED_REGION_ID = 'UNASSIGNED';
export const UNKNOWN_VALUE_DISPLAY = 'N/A'; // Display value for unknown / unavailable data points in the UI
export const LOADING_VALUE_DISPLAY = 'Loading...'; // Display value for data points that are currently loading in the UI

export const STALE_COMMUTER_DATA_THRESHOLD_SECONDS = 900; // Threshold for considering commuter data stale and in need of refresh, in seconds of in-game time (15 minutes)
export const STALE_INFRA_DATA_THRESHOLD_SECONDS = 86400; // Threshold for considering infra data stale and in need of refresh, in seconds of in-game time (daily)
export const DEFAULT_CHUNK_SIZE = 100; // Default loop chunk size for time-sliced data processing

export const REGIONS_INFO_CONTAINER_ID = 'regions-info-container';
export const REGIONS_INFO_UPDATE_GAME_INTERVAL = 1800; // 30 in-game minutes
export const REGIONS_INFO_UPDATE_REAL_INTERVAL = 3; // 3 real-world seconds
export const REGIONS_DESELECT_KEY = 'Escape';

export const REGIONS_INFO_PANEL_ID = 'regions-info-panel';
export const REGIONS_INFO_PANEL_TITLE = 'Region Info';
export const REGIONS_INFO_PANEL_MOD_ID = 'regions-info-panel';

export const INFO_PANEL_MIN_WIDTH = 80;

