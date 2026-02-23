import type { SortConfig } from '../types';
import { SortDirection, SortState } from '../types';

export function sortWithFallback<Row, Metrics>(
  rows: Row[],
  sortState: SortState,
  resolveSortConfig: (columnIndex: number) => SortConfig<Metrics>,
  resolveMetrics: (row: Row) => Metrics,
  tieBreak: (
    aMetrics: Metrics,
    bMetrics: Metrics,
    aRow: Row,
    bRow: Row,
  ) => number,
): Row[] {
  const compareByDescriptor = (
    a: Row,
    b: Row,
    sortIndex: number,
    direction: SortDirection,
  ): number => {
    const sortConfig = resolveSortConfig(sortIndex);
    const compareResult = sortConfig.compare(
      resolveMetrics(a),
      resolveMetrics(b),
    );
    return direction === SortDirection.Asc ? compareResult : -compareResult;
  };

  return [...rows].sort((a, b) => {
    let result = compareByDescriptor(
      a,
      b,
      sortState.sortIndex,
      sortState.sortDirection,
    );

    if (result === 0) {
      result = compareByDescriptor(
        a,
        b,
        sortState.previousSortIndex,
        sortState.previousSortDirection,
      );
    }

    if (result === 0) {
      result = tieBreak(resolveMetrics(a), resolveMetrics(b), a, b);
    }

    return result;
  });
}

export function getNextSortState<T>(
  current: SortState,
  columnIndex: number,
  resolveSortConfig: (columnIndex: number) => SortConfig<T>,
): SortState {
  if (current.sortIndex === columnIndex)
    return SortState.reverseDirection(current);

  const nextSortDescriptor = resolveSortConfig(columnIndex);
  return {
    previousSortIndex: current.sortIndex,
    previousSortDirection: current.sortDirection,
    sortIndex: columnIndex,
    sortDirection: nextSortDescriptor.defaultDirection,
  };
}
