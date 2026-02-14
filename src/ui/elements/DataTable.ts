import type {
  useState
} from 'react';
import {
  type createElement,
  type CSSProperties,
  type Dispatch,
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
  borderBottom?: boolean;
  rowClassName?: string;
  rowHoverClassName?: string;
  colSpan?: number[];
  onClick?: (() => void)[];
  sortState?: SortState;
  align?: ('left' | 'right' | 'center')[];
};

export type DataTableValue = string | number | HTMLElement;

export type DataTableRow = {
  rowValues: DataTableValue[];
  options?: DataRowOptions;
};

export type TableDensity = 'compact' | 'standard' | 'relaxed';

// Mapping of CSS classes for several default table "denssity" options
const TABLE_DENSITY_SETTINGS: Record<TableDensity, string> = {
  compact: 'gap-y-0.5 text-xs leading-4',
  standard: 'gap-y-1 text-[0.78rem] leading-4',
  relaxed: 'gap-y-1.5 text-[0.8rem] leading-5',
};

export type TableOptions = {
  columnTemplate: string;
  density: TableDensity;
};

// --- DOM Implementation ---

export function DataTable(
  tableOptions: TableOptions,
  tableValues: DataTableRow[],
): HTMLElement {
  const table = document.createElement('div');
  table.className = `grid min-w-0 ${TABLE_DENSITY_SETTINGS[tableOptions.density]}`;
  table.style.gridTemplateColumns = tableOptions.columnTemplate;

  tableValues.forEach(({ rowValues, options }) => {
    const rowOptions = options ?? {};
    const isHeader = rowOptions.header ?? false;
    const rowCells: HTMLDivElement[] = [];

    rowValues.forEach((value, colIndex) => {
      const cell = buildDOMCell(value, rowOptions, colIndex, isHeader);
      rowCells.push(cell);
      table.appendChild(cell);
    });

    attachDOMRowHoverHandlers(rowCells, rowOptions.rowHoverClassName);
  });

  return table;
}

function buildDOMCell(
  cellValue: DataTableValue,
  rowOptions: DataRowOptions,
  index: number,
  isHeader: boolean,
): HTMLDivElement {
  const cell = document.createElement('div');

  const presentation = computeCellPresentation(
    cellValue,
    rowOptions,
    index,
    isHeader,
  );

  if (rowOptions.onClick?.[index]) {
    cell.addEventListener('click', rowOptions.onClick?.[index]);
  }

  if (presentation.style) {
    Object.assign(cell.style, presentation.style);
  }

  cell.className = presentation.className;

  if (cellValue instanceof HTMLElement) {
    cell.appendChild(cellValue);
    if (presentation.indicator)
      cell.appendChild(document.createTextNode(presentation.indicator!));
  } else {
    cell.textContent = String(cellValue) + (presentation.indicator ?? '');
  }

  return cell;
}

// --- React Implementation --- //

type ReactDataTableViewProps = {
  h: typeof createElement;
  useStateHook: typeof useState;
  tableOptions: TableOptions;
  tableValues: DataTableRow[];
};


export function ReactDataTable(
  h: typeof createElement,
  useStateHook: typeof useState,
  tableOptions: TableOptions,
  tableValues: DataTableRow[],
): ReactNode {
  return h(ReactDataTableView, { h, useStateHook, tableOptions, tableValues });
}

function ReactDataTableView({
  h,
  useStateHook,
  tableOptions,
  tableValues,
}: ReactDataTableViewProps): ReactNode {
  const [hoveredRowIndex, setHoveredRowIndex] =
    useStateHook<number | null>(null);
  const cells: ReactNode[] = [];

  tableValues.forEach(({ rowValues, options }, rowIndex) => {
    const rowOptions = options ?? {};
    const isHeader = rowOptions.header ?? false;

    rowValues.forEach((value, colIndex) => {
      cells.push(
        buildReactCell(
          h,
          value,
          rowOptions,
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
  cellValue: DataTableValue,
  rowOptions: DataRowOptions,
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
    index,
    isHeader,
  );
  const hasRowHoverClass = getClassTokens(rowOptions.rowHoverClassName).length > 0;
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
      setHoveredRowIndex((current) => (current === rowIndex ? null : current));
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
        onMouseEnter,
        onMouseLeave,
      },
      ...children,
    );
  } else {
    return h(
      'div',
      {
        key,
        className,
        style: presentation.style,
        'data-table-row': rowIndex,
        onClick: rowOptions.onClick?.[index],
        onMouseEnter,
        onMouseLeave,
      },
      String(cellValue) + (presentation.indicator ?? ''),
    );
  }
}

// --- Helper Functions --- //

function getCellAlignmentClass(align: 'left' | 'right' | 'center'): string {
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
  align: 'left' | 'right' | 'center',
): string {
  return [
    'min-w-0',
    shouldTruncate ? 'truncate' : 'overflow-visible',
    getCellAlignmentClass(align),
    'py-0.5',
  ].join(' ');
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

function applyRowHoverClassTokens(
  rowCells: HTMLElement[],
  hoverClassTokens: string[],
  shouldApply: boolean,
): void {
  if (hoverClassTokens.length === 0 || rowCells.length === 0) {
    return;
  }
  for (const rowCell of rowCells) {
    if (shouldApply) {
      rowCell.classList.add(...hoverClassTokens);
    } else {
      rowCell.classList.remove(...hoverClassTokens);
    }
  }
}

function isEventMovingWithinRow(
  relatedTarget: EventTarget | null,
  rowCells: HTMLElement[],
): boolean {
  if (!(relatedTarget instanceof Node)) {
    return false;
  }
  return rowCells.some((rowCell) => rowCell.contains(relatedTarget));
}

function isEventMovingWithinReactRow(
  relatedTarget: EventTarget | null,
  rowIndex: number,
): boolean {
  if (!(relatedTarget instanceof Element)) {
    return false;
  }
  const relatedRow = relatedTarget.closest('[data-table-row]');
  if (!relatedRow) {
    return false;
  }
  return relatedRow.getAttribute('data-table-row') === String(rowIndex);
}

function attachDOMRowHoverHandlers(
  rowCells: HTMLDivElement[],
  rowHoverClassName?: string,
): void {
  const hoverClassTokens = getClassTokens(rowHoverClassName);

  const onMouseOver = () => {
    applyRowHoverClassTokens(rowCells, hoverClassTokens, true);
  };
  const onMouseOut = (event: MouseEvent) => {
    if (isEventMovingWithinRow(event.relatedTarget, rowCells)) return;
    scheduleRowHoverClassRemoval(rowCells, hoverClassTokens);
  };

  for (const rowCell of rowCells) {
    rowCell.addEventListener('mouseover', onMouseOver);
    rowCell.addEventListener('mouseout', onMouseOut);
  }
}

function scheduleRowHoverClassRemoval(
  rowCells: HTMLElement[],
  hoverClassTokens: string[],
): void {
  const removeIfNotHovered = () => {
    // Avoid removing hover class is there exists another cell within the same row that is currently hovered
    if (rowCells.some((rowCell) => rowCell.matches(':hover'))) return;
    applyRowHoverClassTokens(rowCells, hoverClassTokens, false);
  };

  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    window.requestAnimationFrame(removeIfNotHovered);
    return;
  }

  setTimeout(removeIfNotHovered, 0);
}

function computeCellPresentation(
  cellValue: DataTableValue,
  rowOptions: DataRowOptions,
  index: number,
  isHeader: boolean,
): {
  className: string;
  indicator?: string;
  style?: CSSProperties;
} {
  let indicator = getSortIndicator(rowOptions.sortState, index);

  const span = rowOptions.colSpan?.[index];
  const align = rowOptions.align?.[index] ?? 'left';
  const isSelectedSort = rowOptions.sortState?.index === index;

  // Truncate cell text if it's not a header, or if it's a string/number with content
  const shouldTruncate =
    !isHeader ||
    (typeof cellValue === 'string' &&
      (cellValue.length > 0 || indicator.length > 0)) ||
    typeof cellValue === 'number';

  const classNames = [
    getCellBaseClass(shouldTruncate, align),
    getCellTextClass(isHeader, !isHeader && index > 0),
  ];

  if (isSelectedSort && rowOptions.sortState?.sortSelectedClass) {
    classNames.push(rowOptions.sortState.sortSelectedClass);
  }

  if (rowOptions.borderBottom) {
    classNames.push('border-b border-border/30');
  }
  if (rowOptions.rowClassName) {
    classNames.push(rowOptions.rowClassName);
  }

  if (rowOptions.onClick?.[index]) {
    classNames.push('cursor-pointer hover:text-foreground');
  }

  const style = span && span > 1 ? { gridColumn: `span ${span}` } : undefined;

  return {
    className: classNames.join(' '),
    indicator: indicator,
    style: style,
  };
}
