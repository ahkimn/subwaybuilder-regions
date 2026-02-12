import { createElement, CSSProperties, ReactNode } from "react";

export type SortState = {
  index: number;
  directionLabel: string;
  sortSelectedClass?: string;
};

export type DataRowOptions = {
  header?: boolean;
  borderBottom?: boolean;
  rowClassName?: string;
  colSpan?: number[];
  onClick?: (() => void)[];
  sortState?: SortState;
  align?: ('left' | 'right' | 'center')[];
};

export type DataTableValue = string | number | HTMLElement;

export type DataTableRow = {
  rowValues: DataTableValue[],
  options?: DataRowOptions
}

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
}



// --- DOM Implementation ---

export function DataTable(
  tableOptions: TableOptions,
  tableValues: DataTableRow[],
): HTMLElement {

  const table = document.createElement('div');
  table.className = `grid min-w-0 ${TABLE_DENSITY_SETTINGS[tableOptions.density]}`;
  table.style.gridTemplateColumns = tableOptions.columnTemplate;

  for (const { rowValues, options } of tableValues) {
    const rowOptions = options ?? {};
    const isHeader = rowOptions.header ?? false;

    rowValues.forEach((value, i) => {
      const cell = buildDOMCell(value, rowOptions, i, isHeader);
      table.appendChild(cell);
    });
  }

  return table;
}

function buildDOMCell(
  cellValue: DataTableValue,
  rowOptions: DataRowOptions,
  index: number,
  isHeader: boolean
): HTMLDivElement {
  const cell = document.createElement('div');

  const presentation = computeCellPresentation(cellValue, rowOptions, index, isHeader);

  if (rowOptions.onClick?.[index]) {
    cell.addEventListener('click', rowOptions.onClick?.[index]);
  }

  if (presentation.style) {
    Object.assign(cell.style, presentation.style);
  }

  cell.className = presentation.className;

  if (cellValue instanceof HTMLElement) {
    cell.appendChild(cellValue);
    if (presentation.indicator) cell.appendChild(document.createTextNode(presentation.indicator!));
  } else {
    cell.textContent = String(cellValue) + (presentation.indicator ?? "");
  }

  return cell;
}

// --- React Implementation --- //

export function ReactDataTable(
  h: typeof createElement,
  tableOptions: TableOptions,
  tableValues: DataTableRow[],
): ReactNode {
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
          `${rowIndex}:${colIndex}`
        )
      );
    });
  });

  return h(
    "div",
    {
      className: `grid min-w-0 ${TABLE_DENSITY_SETTINGS[tableOptions.density]}`,
      style: { gridTemplateColumns: tableOptions.columnTemplate },
    },
    cells
  );
}

function buildReactCell(
  h: typeof createElement,
  cellValue: DataTableValue,
  rowOptions: DataRowOptions,
  index: number,
  isHeader: boolean,
  key: string
): ReactNode {

  const presentation = computeCellPresentation(cellValue, rowOptions, index, isHeader);

  if (cellValue instanceof HTMLElement) {
    const children: ReactNode[] = [
      h("span", {
        key: "host",
        className: "contents",
        ref: (node: HTMLElement | null) => {
          if (!node) return;
          if (node.firstChild === cellValue) return;
          node.replaceChildren(cellValue);
        },
      }),
    ];

    if (presentation.indicator) children.push(presentation.indicator!);
    return h("div", { key, className: presentation.className }, ...children);

  } else {
    return h(
      "div",
      {
        key,
        className: presentation.className,
        style: presentation.style,
        onClick: rowOptions.onClick?.[index],
      },
      String(cellValue) + (presentation.indicator ?? "")
    )
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
  align: 'left' | 'right' | 'center'
): string {
  return [
    'min-w-0',
    shouldTruncate ? 'truncate' : 'overflow-visible',
    getCellAlignmentClass(align),
    'py-0.5',
  ].join(' ');
}

function getCellTextClass(
  isHeader: boolean,
  isDataCol: boolean
): string {
  if (isHeader) {
    return 'text-[0.72rem] text-muted-foreground font-semibold pb-1.5 tracking-wide whitespace-nowrap';
  }
  if (isDataCol) {
    return 'font-mono';
  }
  return 'font-medium text-foreground/90';
}

function getSortIndicator(sortState: SortState | undefined, index: number): string {
  if (!sortState || sortState.index !== index || !sortState.directionLabel) return "";
  return `${sortState.directionLabel}`;
}

function computeCellPresentation(
  cellValue: DataTableValue,
  rowOptions: DataRowOptions,
  index: number,
  isHeader: boolean
): {
  className: string;
  indicator?: string;
  style?: CSSProperties;
} {

  let indicator = getSortIndicator(rowOptions.sortState, index);

  const span = rowOptions.colSpan?.[index];
  const align = rowOptions.align?.[index] ?? "left";
  const isSelectedSort = rowOptions.sortState?.index === index;

  // Truncate cell text if it's not a header, or if it's a string/number with content
  const shouldTruncate =
    !isHeader || (typeof cellValue === 'string' && (cellValue.length > 0 || indicator.length > 0)) || typeof cellValue === 'number';

  const classNames = [
    getCellBaseClass(shouldTruncate, align),
    getCellTextClass(isHeader, !isHeader && index > 0),
  ];

  if (isSelectedSort && rowOptions.sortState?.sortSelectedClass) {
    classNames.push(rowOptions.sortState.sortSelectedClass);
  }

  if (rowOptions.borderBottom) {
    classNames.push("border-b border-border/30");
  }
  if (rowOptions.rowClassName) {
    classNames.push(rowOptions.rowClassName);
  }

  if (rowOptions.onClick?.[index]) {
    classNames.push("cursor-pointer hover:text-foreground");
  }

  const style = span && span > 1 ? { gridColumn: `span ${span}` } : undefined;

  return {
    className: classNames.join(" "),
    indicator: indicator,
    style: style
  };
}

