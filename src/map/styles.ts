import type { ExpressionSpecification } from 'maplibre-gl';

export type LightMode = 'light' | 'dark';

export const BASE_FILL_OPACITY = 0.25;
export const HOVER_FILL_OPACITY = 0.5;

export const SCALED_TEXT_SIZE_SETTINGS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  5,
  10,
  10,
  13,
  14,
  18,
];

export const DEFAULT_LIGHT_MODE_LABEL_SETTINGS = {
  'text-color': '#1F2933',
  'hover-text-color': '#0F766E',
  'text-halo-color': '#FFFFFF',
  'text-halo-width': 1.75,
  'hover-halo-width': 2.5,
  'text-halo-blur': 0.3,
  'text-size': SCALED_TEXT_SIZE_SETTINGS,
};

export const DEFAULT_DARK_MODE_LABEL_SETTINGS = {
  'text-color': '#F8FAFC',
  'hover-text-color': '#FBBF24',
  'text-halo-color': '#0F172A',
  'text-halo-width': 1.75,
  'hover-halo-width': 2.5,
  'text-halo-blur': 0.3,
  'text-size': SCALED_TEXT_SIZE_SETTINGS,
};

export const SCALED_BOUNDARY_LINE_WIDTH_SETTINGS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  4,
  0.4,
  8,
  0.75,
  12,
  1.2,
];

export const DEFAULT_LIGHT_MODE_BOUNDARY_SETTINGS = {
  'line-color': '#2B2B2B',
  'line-opacity': 0.55,
  'line-width': SCALED_BOUNDARY_LINE_WIDTH_SETTINGS,
};

export const DEFAULT_DARK_MODE_BOUNDARY_SETTINGS = {
  'line-color': '#D1D5DB',
  'line-opacity': 0.45,
  'line-width': SCALED_BOUNDARY_LINE_WIDTH_SETTINGS,
};

export function stateBoolean(
  stateKey: 'hover' | 'selected',
  whenTrue: ExpressionSpecification | string | number,
  whenFalse: ExpressionSpecification | string | number,
): ExpressionSpecification {
  return [
    'case',
    ['boolean', ['feature-state', stateKey], false],
    whenTrue,
    whenFalse,
  ];
}
