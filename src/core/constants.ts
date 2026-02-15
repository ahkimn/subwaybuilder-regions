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
export const PERCENT_DECIMALS = 2; // Default number of decimal places for percentage values in the UI

export const STALE_COMMUTER_DATA_THRESHOLD_SECONDS = 900; // Threshold for considering commuter data stale and in need of refresh, in seconds of in-game time (15 minutes)
export const STALE_INFRA_DATA_THRESHOLD_SECONDS = 604800; // Threshold for considering infra data stale and in need of refresh, in seconds of in-game time (weekly)
export const DEFAULT_CHUNK_SIZE = 100; // Default loop chunk size for time-sliced data processing
export const REGION_BOUNDARY_GRID_X_CELLS = 32; // Number of horizontal cells for dataset boundary acceleration grid
export const REGION_BOUNDARY_GRID_Y_CELLS = 32; // Number of vertical cells for dataset boundary acceleration grid

export const REGIONS_INFO_CONTAINER_ID = 'regions-info-container';
export const REGIONS_INFO_UPDATE_GAME_INTERVAL = 900; // 15 in-game minutes
export const REGIONS_INFO_UPDATE_REAL_INTERVAL = 3; // 3 real-world seconds
export const UPDATE_ON_DEMAND_CHANGE = true; // If true, commuter refresh checks are triggered by onDemandChange instead of polling
export const REGIONS_DESELECT_KEY = 'Escape';

export const REGIONS_INFO_ROOT_PREFIX = 'regions-info';
export const REGIONS_INFO_PANEL_ID = 'regions-info-panel';
export const REGIONS_INFO_PANEL_TITLE = 'Region Info';
export const REGIONS_INFO_PANEL_MOD_ID = 'regions-info-panel';
export const LAYERS_PANEL_MOD_ID = 'layers-panel';

export const MOD_ID_ATTR = 'data-mod-id';
export const MOD_ROLE_ATTR = 'data-mod-role';

export function modIdSelector(modId: string): string {
  return `[${MOD_ID_ATTR}="${modId}"]`;
}

export function modRoleSelector(modRole: string): string {
  return `[${MOD_ROLE_ATTR}="${modRole}"]`;
}

export const REGIONS_LAYER_TOGGLE_CONTAINER_MOD_ID = 'regions-layer-toggles';
export const REGIONS_LAYER_TOGGLE_MOD_ROLE = 'regions-layer-toggle';

export const REGIONS_OVERVIEW_PANEL_ID = 'regions-overview-toolbar-panel';
export const REGIONS_OVERVIEW_PANEL_TITLE = 'Regions Overview';
export const REGIONS_OVERVIEW_PANEL_MOD_ID = 'regions-overview-panel';
export const REGIONS_OVERVIEW_PANEL_CONTENT_ID =
  'regions-overview-panel-content';

export const FLOATING_PANEL_OFFSET_X = 80;
export const FLOATING_PANEL_OFFSET_Y = 80;

export const INFO_PANEL_MIN_WIDTH = 80;

// TODO: (Feature) add as config option
export const SHOW_UNPOPULATED_REGIONS = false; // Whether to show regions with no demand data by default in the overview panel and layer.
export const ENFORCE_ONE_DATASET_VISIBLE = true; // Whether to enforce that only one dataset's map layers can be visible at a time, or allow multiple datasets' layers to be toggled on simultaneously
