import { getPrimaryChartColorByName } from './ui/types/DisplayColor';

// DOM data attributes for mod element identification
export const MOD_ID_ATTR = 'data-mod-id';
export const MOD_ROLE_ATTR = 'data-mod-role';
export const REGIONS_ID_ATTR = 'data-regions-id';

export function modIdSelector(modId: string): string {
  return `[${MOD_ID_ATTR}="${modId}"]`;
}

export function modRoleSelector(modRole: string): string {
  return `[${MOD_ROLE_ATTR}="${modRole}"]`;
}

export function modRegionsIdSelector(regionsId: string): string {
  return `[${REGIONS_ID_ATTR}="${regionsId}"]`;
}

// Semantic color constants used by UI elements
export const SUCCESS_HEX = getPrimaryChartColorByName('Green').hex;
export const WARNING_HEX = getPrimaryChartColorByName('Amber').hex;
export const ERROR_HEX = getPrimaryChartColorByName('Red').hex;
export const INFO_HEX = getPrimaryChartColorByName('Blue').hex;
