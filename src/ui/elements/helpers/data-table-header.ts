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

type HeaderSortState = {
  sortIndex: number;
  sortDirection: string;
};

const SORT_DIRECTION_ASC = 'Asc';

export function buildSortableHeaderRow(params: {
  headerLabels: readonly ReactDataTableValue[];
  sortState: HeaderSortState;
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
          sortState.sortDirection === SORT_DIRECTION_ASC
            ? ' \u25B2'
            : ' \u25BC',
        sortSelectedClass: classOverrides?.sortSelectedClass ?? 'text-foreground',
      },
    },
  };
}
