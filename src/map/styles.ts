import type { ExpressionSpecification } from 'maplibre-gl';

export type LightMode = 'light' | 'dark';

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
  'text-color': '#1E293B',
  'hover-text-color': '#FBBF24',
  'text-halo-color': '#FFFFFF',
  'text-halo-width': 1.2,
  'hover-halo-width': 1.6,
  'text-halo-blur': 0.3,
  'text-font': ['Noto Sans Regular'],
  'text-letter-spacing': 0.04,
  'text-size': SCALED_TEXT_SIZE_SETTINGS,
};

export const DEFAULT_DARK_MODE_LABEL_SETTINGS = {
  'text-color': '#F8FAFC',
  'hover-text-color': '#FBBF24',
  'text-halo-color': '#0B1220',
  'text-halo-width': 1,
  'hover-halo-width': 1.4,
  'text-halo-blur': 0.4,
  'text-font': ['Noto Sans Regular'],
  'text-letter-spacing': 0.04,
  'text-size': SCALED_TEXT_SIZE_SETTINGS,
};

export const SCALED_BOUNDARY_LINE_WIDTH_SETTINGS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  4,
  0.6,
  8,
  0.9,
  12,
  1.2,
];

export const DEFAULT_LIGHT_MODE_BOUNDARY_SETTINGS = {
  'line-color': '#5F6C78',
  'line-opacity': 0.42,
  'line-width': SCALED_BOUNDARY_LINE_WIDTH_SETTINGS,
  'fill-opacity': 0.09,
  'hover-fill-opacity': 0.16,
  'selected-fill-opacity': 0.24,
};

export const DEFAULT_DARK_MODE_BOUNDARY_SETTINGS = {
  'line-color': '#9BAEC0',
  'line-opacity': 0.52,
  'line-width': SCALED_BOUNDARY_LINE_WIDTH_SETTINGS,
  'fill-opacity': 0.07,
  'hover-fill-opacity': 0.14,
  'selected-fill-opacity': 0.2,
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
