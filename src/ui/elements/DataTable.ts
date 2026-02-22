import type { useState } from 'react';
import {
  type createElement,
  type CSSProperties,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';

import type { TableAlign } from '../panels/types';

export type SortState = {
  index: number;
  directionLabel: string;
  sortSelectedClass?: string;
};

export type DataRowOptions = {
  header?: boolean;
  borderClassName?: string;
  rowClassName?: string;
  rowHoverClassName?: string;
  colSpan?: number[];
  onClick?: ((event?: ReactMouseEvent<HTMLDivElement>) => void)[];
  onDoubleClick?: ((event?: ReactMouseEvent<HTMLDivElement>) => void)[];
  sortState?: SortState;
  align?: TableAlign[];
};

export type ReactDataTableValue = ReactNode | HTMLElement;

export type ReactDataTableRow = {
  rowValues: ReactDataTableValue[];
  options?: DataRowOptions;
};

export type TableDensity = 'compact' | 'standard' | 'relaxed';
export type TableCellPaddingClassName = Partial<
  Record<TableAlign, string>
>;

// Mapping of CSS classes for several default table "denssity" options
const TABLE_DENSITY_SETTINGS: Record<TableDensity, string> = {
  compact: 'gap-y-0.5 text-xs leading-4',
  standard: 'gap-y-1 text-[0.78rem] leading-4',
  relaxed: 'gap-y-1.5 text-[0.8rem] leading-5',
};

export type TableOptions = {
  columnTemplate: string;
  density: TableDensity;
  tableCellOptions?: TableCellOptions;
};

// --- React Implementation --- //

export type ReactDataTableProps = {
  h: typeof createElement;
  useStateHook: typeof useState;
  tableOptions: TableOptions;
  tableValues: ReactDataTableRow[];
};

export type TableCellOptions = {
  cellBorderClassName?: string;
  cellPaddingClassName?: TableCellPaddingClassName;
  stickyHeaderRow?: boolean;
  stickyFirstColumn?: boolean;
  stickyClassName?: string;
  stickyBorderClassName?: string;
};

const DEFAULT_STICKY_CLASS_NAME = 'bg-background/95 backdrop-blur-sm';
const DEFAULT_STICKY_BORDER_CLASS_NAME = 'border-border/40';

export function ReactDataTable({
  h,
  useStateHook,
  tableOptions,
  tableValues,
}: ReactDataTableProps): ReactNode {
  const [hoveredRowIndex, setHoveredRowIndex] = useStateHook<number | null>(
    null,
  );
  const cells: ReactNode[] = [];
  const cellOptions = tableOptions.tableCellOptions ?? {};

  tableValues.forEach(({ rowValues, options }, rowIndex) => {
    const rowOptions = options ?? {};
    const isHeader = rowOptions.header ?? false;

    rowValues.forEach((value, colIndex) => {
      cells.push(
        buildReactCell(
          h,
          value,
          rowOptions,
          cellOptions,
          colIndex,
          isHeader,
          rowIndex,
          hoveredRowIndex,
          setHoveredRowIndex,
          `${rowIndex}:${colIndex}`,
        ),
      );
    });
  });

  return h(
    'div',
    {
      className: `grid min-w-0 ${TABLE_DENSITY_SETTINGS[tableOptions.density]}`,
      style: { gridTemplateColumns: tableOptions.columnTemplate },
      onMouseLeave: () => setHoveredRowIndex(null),
    },
    cells,
  );
}

function buildReactCell(
  h: typeof createElement,
  cellValue: ReactDataTableValue,
  rowOptions: DataRowOptions,
  cellOptions: TableCellOptions,
  index: number,
  isHeader: boolean,
  rowIndex: number,
  hoveredRowIndex: number | null,
  setHoveredRowIndex: Dispatch<SetStateAction<number | null>>,
  key: string,
): ReactNode {
  const presentation = computeCellPresentation(
    cellValue,
    rowOptions,
    cellOptions,
    index,
    isHeader,
    rowIndex,
  );
  const hasRowHoverClass =
    getClassTokens(rowOptions.rowHoverClassName).length > 0;
  const isHoveredRow = hasRowHoverClass && hoveredRowIndex === rowIndex;
  const className = isHoveredRow
    ? `${presentation.className} ${rowOptions.rowHoverClassName ?? ''}`
    : presentation.className;

  const onMouseEnter = hasRowHoverClass
    ? () => setHoveredRowIndex(rowIndex)
    : undefined;
  const onMouseLeave = hasRowHoverClass
    ? (event: { relatedTarget: EventTarget | null }) => {
      if (isEventMovingWithinReactRow(event.relatedTarget, rowIndex)) {
        return;
      }
      setHoveredRowIndex((current) =>
        current === rowIndex ? null : current,
      );
    }
    : undefined;

  if (cellValue instanceof HTMLElement) {
    const children: ReactNode[] = [
      h('span', {
        key: 'host',
        className: 'contents',
        ref: (node: HTMLElement | null) => {
          if (!node) return;
          if (node.firstChild === cellValue) return;
          node.replaceChildren(cellValue);
        },
      }),
    ];

    if (presentation.indicator) children.push(presentation.indicator!);
    return h(
      'div',
      {
        key,
        className,
        'data-table-row': rowIndex,
        onClick: rowOptions.onClick?.[index],
        onDoubleClick: rowOptions.onDoubleClick?.[index],
        onMouseEnter,
        onMouseLeave,
      },
      ...children,
    );
  }

  const children: ReactNode[] = [];
  children.push(cellValue);
  if (presentation.indicator) {
    children.push(presentation.indicator);
  }

  return h(
    'div',
    {
      key,
      className,
      style: presentation.style,
      'data-table-row': rowIndex,
      onClick: rowOptions.onClick?.[index],
      onDoubleClick: rowOptions.onDoubleClick?.[index],
      onMouseEnter,
      onMouseLeave,
    },
    ...children,
  );
}

// --- Helper Functions --- //

function getCellAlignmentClass(align: TableAlign): string {
  if (align === 'right') {
    return 'text-right tabular-nums';
  }
  if (align === 'center') {
    return 'text-center';
  }
  return 'text-left';
}

function getCellBaseClass(
  shouldTruncate: boolean,
  align: TableAlign,
  cellPaddingClassNames: TableCellPaddingClassName,
): string {
  const horizontalPaddingClass = getCellPaddingClass(
    align,
    cellPaddingClassNames,
  );

  return [
    'min-w-0',
    shouldTruncate ? 'truncate' : 'overflow-visible',
    getCellAlignmentClass(align),
    horizontalPaddingClass,
    'py-0.5',
  ].join(' ');
}

function getCellPaddingClass(
  align: TableAlign,
  cellPaddingClassNames: TableCellPaddingClassName,
): string {
  return cellPaddingClassNames[align] ?? '';
}

function getCellTextClass(isHeader: boolean, isDataCol: boolean): string {
  if (isHeader) {
    return 'text-[0.72rem] text-muted-foreground font-semibold pb-1.5 tracking-wide whitespace-nowrap';
  }
  if (isDataCol) {
    return 'font-mono';
  }
  return 'font-medium text-foreground/90';
}

function getSortIndicator(
  sortState: SortState | undefined,
  index: number,
): string {
  if (!sortState || sortState.index !== index || !sortState.directionLabel)
    return '';
  return `${sortState.directionLabel}`;
}

function getClassTokens(className?: string): string[] {
  return className?.split(/\s+/).filter(Boolean) ?? [];
}

function isEventMovingWithinReactRow(
  relatedTarget: EventTarget | null,
  rowIndex: number,
): boolean {
  if (!(relatedTarget instanceof Element)) return false;
  const relatedRow = relatedTarget.closest('[data-table-row]');
  return relatedRow
    ? relatedRow.getAttribute('data-table-row') === String(rowIndex)
    : false;
}

function computeCellPresentation(
  cellValue: unknown,
  rowOptions: DataRowOptions,
  cellOptions: TableCellOptions,
  colIndex: number,
  isHeader: boolean,
  rowIndex: number,
): {
  className: string;
  indicator?: string;
  style?: CSSProperties;
} {
  let indicator = getSortIndicator(rowOptions.sortState, colIndex);

  const span = rowOptions.colSpan?.[colIndex];
  const align = rowOptions.align?.[colIndex] ?? 'left';
  const isSelectedSort = rowOptions.sortState?.index === colIndex;
  const isStickyHeaderCell =
    (cellOptions.stickyHeaderRow ?? false) && rowIndex === 0;
  const isStickyFirstColumnCell =
    (cellOptions.stickyFirstColumn ?? false) && colIndex === 0;
  const isStickyCell = isStickyHeaderCell || isStickyFirstColumnCell;

  // Truncate cell text if it's not a header, or if it's a string/number with content
  const shouldTruncate =
    !isHeader ||
    (typeof cellValue === 'string' &&
      (cellValue.length > 0 || indicator.length > 0)) ||
    typeof cellValue === 'number';

  const classNames = [
    getCellBaseClass(
      shouldTruncate,
      align,
      cellOptions.cellPaddingClassName ?? {},
    ),
    getCellTextClass(isHeader, !isHeader && colIndex > 0),
  ];

  if (isSelectedSort && rowOptions.sortState?.sortSelectedClass) {
    classNames.push(rowOptions.sortState.sortSelectedClass);
  }

  if (rowOptions.rowClassName) {
    classNames.push(rowOptions.rowClassName);
  }

  if (rowOptions.onClick?.[colIndex] || rowOptions.onDoubleClick?.[colIndex]) {
    classNames.push('cursor-pointer hover:text-foreground');
  }
  // Row boundary classes take precedence over cell (table-wide) border classes
  if (rowOptions.borderClassName !== undefined) {
    classNames.push(rowOptions.borderClassName);
  } else if (cellOptions.cellBorderClassName) {
    classNames.push(cellOptions.cellBorderClassName);
  }

  if (isStickyCell) {
    classNames.push(cellOptions.stickyClassName ?? DEFAULT_STICKY_CLASS_NAME);
    if (cellOptions.stickyBorderClassName) {
      classNames.push(
        cellOptions.stickyBorderClassName ?? DEFAULT_STICKY_BORDER_CLASS_NAME,
      );
    }
    if (isStickyHeaderCell) {
      classNames.push('border-b');
    }
    if (isStickyFirstColumnCell) {
      classNames.push('border-r');
    }
  }

  const style: CSSProperties = {};
  if (span && span > 1) {
    style.gridColumn = `span ${span}`;
  }
  if (isStickyCell) {
    style.position = 'sticky';
    style.zIndex =
      isStickyHeaderCell && isStickyFirstColumnCell
        ? 30
        : isStickyHeaderCell
          ? 20
          : 10;
    if (isStickyHeaderCell) {
      style.top = 0;
    }
    if (isStickyFirstColumnCell) {
      style.left = 0;
    }
  }

  return {
    className: classNames.join(' '),
    indicator: indicator,
    style: Object.keys(style).length === 0 ? undefined : style,
  };
}
