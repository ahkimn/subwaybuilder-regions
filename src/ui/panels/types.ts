import type React from 'react';

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
  reverseDirection(a: SortState): SortState {
    return {
      ...a,
      sortDirection:
        a.sortDirection === SortDirection.Asc
          ? SortDirection.Desc
          : SortDirection.Asc,
    };
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

export type InputFieldProperties = {
  value?: string;
  placeholder?: string;
  onChange?: (e: Event) => void;
  className?: string;
};

export type SwitchProperties = {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (e: Event) => void;
  id?: string;
};

export type LabelProperties = {
  htmlFor?: string;
  className?: string;
  children?: React.ReactNode;
};

export type TableAlign = 'left' | 'right' | 'center';
