// For non-preset datasets or custom user datasets
export const DEFAULT_UNIT_LABELS = { singular: 'Region', plural: 'Regions' };

export const UNKNOWN_VALUE_DISPLAY = 'N/A'; // Display value for unknown / unavailable data points in the UI
export const LOADING_VALUE_DISPLAY = 'Loading...'; // Display value for data points that are currently loading in the UI
export const PERCENT_DECIMALS = 2; // Default number of decimal places for percentage values in the UI

export const REGIONS_INFO_CONTAINER_ID = 'regions-info-container';
export const REGIONS_INFO_ROOT_PREFIX = 'regions-info';
export const REGIONS_INFO_PANEL_ID = 'regions-info-panel';
export const REGIONS_INFO_PANEL_TITLE = 'Region Info';
export const REGIONS_INFO_PANEL_MOD_ID = 'regions-info-panel';

export const REGIONS_OVERVIEW_PANEL_ID = 'regions-overview-toolbar-panel';
export const REGIONS_OVERVIEW_PANEL_TITLE = 'Regions Overview';
export const REGIONS_OVERVIEW_PANEL_MOD_ID = 'regions-overview-panel';
export const REGIONS_OVERVIEW_PANEL_CONTENT_ID =
  'regions-overview-panel-content';

export const REGIONS_SETTINGS_MAIN_MENU_COMPONENT_ID =
  'regions-settings-main-menu-component';

export const LAYERS_PANEL_MOD_ID = 'layers-panel';

export const MOD_ID_ATTR = 'data-mod-id';
export const MOD_ROLE_ATTR = 'data-mod-role';

// Naming guideline: constants are immutable configuration values; helpers are computed behavior.
export function modIdSelector(modId: string): string {
  return `[${MOD_ID_ATTR}="${modId}"]`;
}

export function modRoleSelector(modRole: string): string {
  return `[${MOD_ROLE_ATTR}="${modRole}"]`;
}

export const REGIONS_LAYER_TOGGLE_CONTAINER_MOD_ID = 'regions-layer-toggles';
export const REGIONS_LAYER_TOGGLE_MOD_ROLE = 'regions-layer-toggle';

export const REGIONS_DESELECT_KEY = 'Escape';

export const FLOATING_PANEL_OFFSET_X = 80;
export const FLOATING_PANEL_OFFSET_Y = 80;

export const INFO_PANEL_MIN_WIDTH = 80;
export const INFO_PANEL_MIN_VERTICAL_OFFSET = 100; // Minimum vertical offset from bottom of viewport to avoid rendering over the bottom bar
