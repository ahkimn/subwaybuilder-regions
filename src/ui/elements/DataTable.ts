export type SortState = {
  index: number;
  directionLabel: string;
  sortSelectedClass?: string;
}

export type DataRowOptions = {
  header?: boolean;
  borderBottom?: boolean;
  rowClassName?: string;
  colSpan?: number[];
  onClick?: (() => void)[];
  sortState?: SortState;
  align?: ('left' | 'right' | 'center')[];
};

export type DataTableRow = {
  rowValues: Array<string | number | HTMLElement>,
  options?: DataRowOptions
}

export type TableDensity = 'compact' | 'standard' | 'relaxed';

export class TableOptions {
  columnTemplate: string;
  density: TableDensity;

  constructor(columnTemplate: string, density: TableDensity = 'standard') {
    this.columnTemplate = columnTemplate;
    this.density = density;
  }
}

const TABLE_DENSITY_SETTINGS: Record<TableDensity, string> = {
  compact: 'gap-y-0.5 text-xs leading-4',
  standard: 'gap-y-1 text-[0.78rem] leading-4',
  relaxed: 'gap-y-1.5 text-[0.8rem] leading-5',
};


export function DataTable(
  tableOptions: TableOptions,
  tableValues: Array<DataTableRow>,
): HTMLElement {

  const table = document.createElement('div');
  table.className = `grid min-w-0 ${TABLE_DENSITY_SETTINGS[tableOptions.density]}`;
  table.style.gridTemplateColumns = tableOptions.columnTemplate;

  for (const { rowValues, options } of tableValues) {
    const rowOptions = options ?? {};
    const isHeader = rowOptions.header ?? false;

    rowValues.forEach((value, i) => {
      const cell = buildCell(value, rowOptions, i, isHeader);
      table.appendChild(cell);
    });
  }

  return table;
}

function buildCell(
  cellValue: string | number | HTMLElement,
  rowOptions: DataRowOptions,
  index: number,
  isHeader: boolean
): HTMLDivElement {
  const cell = document.createElement('div');

  let value = applySortIndicator(cellValue, rowOptions.sortState, index);
  const span = rowOptions.colSpan?.[index];
  const isSelectedSort = rowOptions.sortState?.index === index;
  const shouldTruncate =
    !isHeader || (typeof value === 'string' && value.length > 0) || typeof value === 'number';
  const align = rowOptions.align?.[index] ?? 'left';

  if (span && span > 1) {
    cell.style.gridColumn = `span ${span}`;
  }

  cell.className = getCellBaseClass(shouldTruncate, align);
  cell.className += ` ${getCellTextClass(
    isHeader, !isHeader && index > 0,
  )}`;

  if (isSelectedSort && rowOptions.sortState?.sortSelectedClass) {
    cell.className += ` ${rowOptions.sortState.sortSelectedClass}`;
  }

  if (rowOptions.borderBottom) {
    cell.className += ' border-b border-border/30';
  }
  if (rowOptions.rowClassName) {
    cell.className += ` ${rowOptions.rowClassName}`;
  }

  if (rowOptions.onClick && rowOptions.onClick[index]) {
    cell.className += ' cursor-pointer hover:text-foreground';
    cell.addEventListener('click', rowOptions.onClick[index]);
  }

  if (value instanceof HTMLElement) {
    cell.appendChild(value);
  } else {
    cell.textContent = String(value);
  }

  return cell;
}

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

function applySortIndicator(
  value: string | number | HTMLElement,
  sortState: SortState | undefined,
  index: number
): string | number | HTMLElement {
  if (!sortState || sortState.index !== index || !sortState.directionLabel) {
    return value;
  }
  if (value instanceof HTMLElement) {
    value.appendChild(document.createTextNode(` ${sortState.directionLabel}`));
    return value;
  }
  return `${value} ${sortState.directionLabel}`;
}
