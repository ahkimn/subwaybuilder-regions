export type NumberDisplay = "absolute" | "percentage";
export type SortDirection = "asc" | "desc";

export interface RegionsPanelRenderer {
  initialize(): void;
  tearDown(): void;
  tryUpdatePanel(): void;
  isVisible(): boolean;
}
