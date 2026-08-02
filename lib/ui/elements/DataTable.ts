import type { TableAlign } from '@lib/ui/panels/types';
import type { useEffect, useRef, useState } from 'react';
import {
  type createElement,
  type CSSProperties,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';

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
export type TableCellPaddingClassName = Partial<Record<TableAlign, string>>;

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

// Opt-in windowed rendering: only the rows within (and just outside) the scroll
// viewport are rendered. Requires useRefHook + useEffectHook. Assumes a single
// sticky header row at index 0 and (roughly) fixed data-row height.
export type VirtualizationOptions = {
  rowHeight: number;
  overscan?: number;
};

export type ReactDataTableProps = {
  h: typeof createElement;
  useStateHook: typeof useState;
  tableOptions: TableOptions;
  tableValues: ReactDataTableRow[];
  virtualization?: VirtualizationOptions;
  useRefHook?: typeof useRef;
  useEffectHook?: typeof useEffect;
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
  virtualization,
  useRefHook,
  useEffectHook,
}: ReactDataTableProps): ReactNode {
  const [hoveredRowIndex, setHoveredRowIndex] = useStateHook<number | null>(
    null,
  );
  const cellOptions = tableOptions.tableCellOptions ?? {};
  const gridClassName = `grid min-w-0 ${TABLE_DENSITY_SETTINGS[tableOptions.density]}`;
  const gridStyle: CSSProperties = {
    gridTemplateColumns: tableOptions.columnTemplate,
  };

  const appendRowCells = (
    cells: ReactNode[],
    row: ReactDataTableRow,
    rowIndex: number,
  ): void => {
    const rowOptions = row.options ?? {};
    const isHeader = rowOptions.header ?? false;
    row.rowValues.forEach((value, colIndex) => {
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
  };

  // Virtualized path (opt-in). The branch is stable per component instance
  // (virtualization is fixed by the caller), so the extra hooks keep a
  // consistent order across renders.
  if (virtualization && useRefHook && useEffectHook) {
    const [scrollTop, setScrollTop] = useStateHook<number>(0);
    const [viewportHeight, setViewportHeight] = useStateHook<number>(0);
    const containerRef = useRefHook<HTMLDivElement | null>(null);

    useEffectHook(() => {
      const el = containerRef.current;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const measure = () => setViewportHeight(el.clientHeight);
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const { rowHeight } = virtualization;
    const overscan = virtualization.overscan ?? 8;
    const headerCount =
      tableValues.length > 0 && tableValues[0].options?.header ? 1 : 0;
    const dataCount = tableValues.length - headerCount;
    // Fall back to a generous window until the container is measured.
    const effectiveViewport = viewportHeight > 0 ? viewportHeight : 600;
    const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const windowRows = Math.ceil(effectiveViewport / rowHeight) + overscan * 2;
    const last = Math.min(dataCount, first + windowRows);
    const topPad = first * rowHeight;
    const bottomPad = Math.max(0, (dataCount - last) * rowHeight);

    const cells: ReactNode[] = [];
    for (let r = 0; r < headerCount; r += 1) {
      appendRowCells(cells, tableValues[r], r);
    }
    if (topPad > 0) {
      cells.push(
        h('div', {
          key: 'virtual-top-spacer',
          style: { gridColumn: '1 / -1', height: `${topPad}px` },
        }),
      );
    }
    for (let i = first; i < last; i += 1) {
      const rowIndex = headerCount + i;
      appendRowCells(cells, tableValues[rowIndex], rowIndex);
    }
    if (bottomPad > 0) {
      cells.push(
        h('div', {
          key: 'virtual-bottom-spacer',
          style: { gridColumn: '1 / -1', height: `${bottomPad}px` },
        }),
      );
    }

    return h(
      'div',
      {
        ref: containerRef,
        className: 'overflow-auto h-full',
        onScroll: (event: ReactMouseEvent<HTMLDivElement>) =>
          setScrollTop(event.currentTarget.scrollTop),
      },
      h(
        'div',
        {
          className: gridClassName,
          style: gridStyle,
          onMouseLeave: () => setHoveredRowIndex(null),
        },
        cells,
      ),
    );
  }

  const cells: ReactNode[] = [];
  tableValues.forEach((row, rowIndex) => appendRowCells(cells, row, rowIndex));

  return h(
    'div',
    {
      className: gridClassName,
      style: gridStyle,
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
