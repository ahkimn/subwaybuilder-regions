export const NumberDisplay = {
  Absolute: 'Absolute',
  Percentage: 'Percentage',
} as const;

export type NumberDisplay = (typeof NumberDisplay)[keyof typeof NumberDisplay];

export const SortDirection = {
  Asc: 'Asc',
  Desc: 'Desc',
} as const;

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

export interface RegionsPanelRenderer {
  initialize(): void;
  tearDown(): void;
  tryUpdatePanel(): void;
  isVisible(): boolean;
}
