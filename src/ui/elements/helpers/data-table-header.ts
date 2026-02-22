import { SortDirection, type SortState } from '../../panels/types';
import type {
  ReactDataTableRow,
  ReactDataTableValue,
} from '../DataTable';

type TableAlign = 'left' | 'right' | 'center';

type HeaderClassOverrides = {
  borderClassName?: string;
  rowClassName?: string;
  rowHoverClassName?: string;
  sortSelectedClass?: string;
};

export function buildSortableHeaderRow(params: {
  headerLabels: readonly ReactDataTableValue[];
  sortState: SortState;
  onSortChange: (columnIndex: number) => void;
  align: readonly TableAlign[];
  classOverrides?: HeaderClassOverrides;
}): ReactDataTableRow {
  const {
    headerLabels,
    sortState,
    onSortChange,
    align,
    classOverrides,
  } = params;

  return {
    rowValues: [...headerLabels],
    options: {
      header: true,
      onClick: headerLabels.map((_, index) => () => onSortChange(index)),
      align: [...align],
      borderClassName: classOverrides?.borderClassName,
      rowClassName: classOverrides?.rowClassName,
      rowHoverClassName: classOverrides?.rowHoverClassName,
      sortState: {
        index: sortState.sortIndex,
        directionLabel:
          sortState.sortDirection === SortDirection.Asc
            ? ' \u25B2'
            : ' \u25BC',
        sortSelectedClass: classOverrides?.sortSelectedClass ?? 'text-foreground',
      },
    },
  };
}
