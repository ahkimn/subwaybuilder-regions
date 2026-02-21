import type { SortConfig } from "../types";
import { SortState } from "../types";

export function getNextSortState<T>(current: SortState,
  columnIndex: number,
  resolveSortConfig: (columnIndex: number) => SortConfig<T>
): SortState {
  if (current.sortIndex === columnIndex) return SortState.reverseDirection(current);

  const nextSortDescriptor = resolveSortConfig(columnIndex);
  return {
    previousSortIndex: current.sortIndex,
    previousSortDirection: current.sortDirection,
    sortIndex: columnIndex,
    sortDirection: nextSortDescriptor.defaultDirection,
  };
}