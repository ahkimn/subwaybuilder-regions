export type Color = {
  hex: string;
  name: string;
  hover: string;
}

export const PRIMARY_FILL_COLORS: Color[] = [
  { hex: '#264653', name: 'Deep Teal', hover: '#2F5F6E' },
  { hex: '#2A9D8F', name: 'Sea Green', hover: '#3CB3A2' },
  { hex: '#E9C46A', name: 'Sand Yellow', hover: '#F2D27C' },
  { hex: '#F4A261', name: 'Soft Orange', hover: '#F7B27C' },
  { hex: '#E76F51', name: 'Coral', hover: '#ED8369' }
];

const DEBUG_COLORS = [
  { hex: '#6A4C93', name: 'Royal Purple' },
  { hex: '#3A86FF', name: 'Electric Blue' },
  { hex: '#8338EC', name: 'Vivid Violet' },
  { hex: '#FF006E', name: 'Magenta Rose' },
  { hex: '#118AB2', name: 'Steel Blue' },
];