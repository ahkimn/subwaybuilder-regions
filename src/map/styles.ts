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
  'text-color': '#F8FAFC',
  'hover-text-color': '#FBBF24',
  'text-halo-color': '#0F172A',
  'text-halo-width': 2,
  'hover-halo-width': 2.75,
  'text-halo-blur': 0.45,
  'text-font': ['Noto Sans Regular'],
  'text-letter-spacing': 0.04,
  'text-size': SCALED_TEXT_SIZE_SETTINGS,
};

export const DEFAULT_DARK_MODE_LABEL_SETTINGS = {
  'text-color': '#F8FAFC',
  'hover-text-color': '#FBBF24',
  'text-halo-color': '#020617',
  'text-halo-width': 2,
  'hover-halo-width': 2.75,
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
  0.4,
  8,
  0.75,
  12,
  1.2,
];

export const DEFAULT_LIGHT_MODE_BOUNDARY_SETTINGS = {
  'line-color': '#334155',
  'line-opacity': 0.42,
  'line-width': SCALED_BOUNDARY_LINE_WIDTH_SETTINGS,
  'fill-opacity': 0.18,
  'hover-fill-opacity': 0.34,
  'selected-fill-opacity': 0.46,
};

export const DEFAULT_DARK_MODE_BOUNDARY_SETTINGS = {
  'line-color': '#D1D5DB',
  'line-opacity': 0.5,
  'line-width': SCALED_BOUNDARY_LINE_WIDTH_SETTINGS,
  'fill-opacity': 0.28,
  'hover-fill-opacity': 0.46,
  'selected-fill-opacity': 0.58,
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
