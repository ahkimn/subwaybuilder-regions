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

export type SortState = {
  sortIndex: number;
  sortDirection: SortDirection;
  previousSortIndex: number;
  previousSortDirection: SortDirection;
};

export const SortState = {
  equals(a: SortState, b: SortState): boolean {
    return (
      a.sortIndex === b.sortIndex &&
      a.sortDirection === b.sortDirection &&
      a.previousSortIndex === b.previousSortIndex &&
      a.previousSortDirection === b.previousSortDirection
    );
  },
};

export type SortConfig<T> = {
  index: number;
  defaultDirection: SortDirection;
  compare: (aMetrics: T, bMetrics: T) => number;
};

export interface RegionsPanelRenderer {
  initialize(): void;
  tearDown(): void;
  tryUpdatePanel(): void;
  isVisible(): boolean;
}

export const DEFAULT_SORT_STATE: SortState = {
  sortIndex: 0,
  sortDirection: SortDirection.Desc,
  previousSortIndex: 1,
  previousSortDirection: SortDirection.Desc,
};
