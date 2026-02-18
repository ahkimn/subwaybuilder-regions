export type MapDisplayColor = {
  hex: string;
  name: string;
  hover: string;
};

export type ChartDisplayColor = {
  hex: string;
  mutedHex: string;
  name: string;
};

export type RGB = {
  r: number;
  g: number;
  b: number;
};

export const PRIMARY_FILL_COLORS: MapDisplayColor[] = [
  { hex: '#264653', name: 'Deep Teal', hover: '#2F5F6E' },
  { hex: '#2A9D8F', name: 'Sea Green', hover: '#3CB3A2' },
  { hex: '#E9C46A', name: 'Sand Yellow', hover: '#F2D27C' },
  { hex: '#F4A261', name: 'Soft Orange', hover: '#F7B27C' },
  { hex: '#E76F51', name: 'Coral', hover: '#ED8369' },
];


export const DEFAULT_CHART_COLOR: ChartDisplayColor = {
  hex: '#B6BABD',
  mutedHex: '#7B828B',
  name: 'Light Gray',
};

export const PRIMARY_CHART_COLORS: ChartDisplayColor[] = [
  { hex: '#FF3B3B', mutedHex: '#8B5961', name: 'Red' },
  { hex: '#B57A3D', mutedHex: '#796245', name: 'Brown' },
  { hex: '#FF6A23', mutedHex: '#8A6444', name: 'Orange' },
  { hex: '#FFB100', mutedHex: '#8A733E', name: 'Amber' },
  { hex: '#A7A62D', mutedHex: '#6E6F46', name: 'Olive' },
  { hex: '#FFD400', mutedHex: '#8C7C3E', name: 'Yellow' },
  { hex: '#6EC948', mutedHex: '#5A7E53', name: 'Lime' },
  { hex: '#00A84A', mutedHex: '#4F7B60', name: 'Green' },
  { hex: '#00B89D', mutedHex: '#4F7A77', name: 'Teal' },
  { hex: '#69C8B0', mutedHex: '#5C8079', name: 'Mint' },
  { hex: '#14B6D8', mutedHex: '#4C7687', name: 'Cyan' },
  { hex: '#0F4FBE', mutedHex: '#4F6F97', name: 'Blue' },
  { hex: '#6C2F8F', mutedHex: '#66507C', name: 'Purple' },
  { hex: '#BA2CAF', mutedHex: '#7A547D', name: 'Magenta' },
  { hex: '#BAA0C3', mutedHex: '#7A7080', name: 'Lavender' },
  { hex: '#8F0F66', mutedHex: '#6F4E67', name: 'Burgundy' },
  { hex: '#C448A9', mutedHex: '#7B5A7A', name: 'Pink' },
  { hex: '#E5A5C0', mutedHex: '#8A6E7A', name: 'Blush' },
  { hex: '#8E9196', mutedHex: '#68707E', name: 'Gray' },
  { hex: '#000000', mutedHex: '#000000', name: 'Black' },
  { hex: '#FFFFFF', mutedHex: '#FFFFFF', name: 'White' },
  { hex: '#C1CEDE', mutedHex: '#8A98AA', name: 'Pale Blue' },
  DEFAULT_CHART_COLOR,
];
export function getPrimaryChartColorByName(colorName: string): ChartDisplayColor {
  const color = PRIMARY_CHART_COLORS.find((entry) => entry.name === colorName);
  if (color) return color;
  else return DEFAULT_CHART_COLOR;
}

export const BLACK = getPrimaryChartColorByName('Black').hex;
export const WHITE = getPrimaryChartColorByName('White').hex;
export const SANKEY_TERMINAL_NODE_COLOR = getPrimaryChartColorByName('Pale Blue').hex;

export function hexToRgb(hex: string): RGB | null {
  const normalized = hex.replace('#', '');
  if (!(normalized.length === 3 || normalized.length === 6)) return null;

  const expanded = normalized.length === 3
    ? normalized
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
    : normalized;

  const value = Number.parseInt(expanded, 16);
  if (Number.isNaN(value)) return null;

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function rgbToHex(value: RGB): string {
  const clamp = (component: number) => Math.max(0, Math.min(255, Math.round(component)));
  const toHex = (component: number) => clamp(component).toString(16).padStart(2, '0');
  return `#${toHex(value.r)}${toHex(value.g)}${toHex(value.b)}`;
}
