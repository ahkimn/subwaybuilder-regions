export type SortState = {
  index: number;
  directionLabel: string;
  sortSelectedClass?: string;
}

export type DataRowOptions = {
  header?: boolean;
  borderBottom?: boolean;
  colSpan?: number[];
  onClick?: (() => void)[];
  sortState?: SortState;
  align?: ('left' | 'right' | 'center')[];
};

export type DataTableRow = {
  rowValues: Array<string | number | HTMLElement>,
  options?: DataRowOptions
}

export function DataTable(
  columnTemplate: string,
  tableValues: Array<DataTableRow>,
): HTMLElement {

  const table = document.createElement('div');
  table.className = 'grid gap-y-0.5 text-xs min-w-0';
  table.style.gridTemplateColumns = columnTemplate;

  for (const { rowValues, options } of tableValues) {
    const rowOptions = options ?? {};
    const isHeader = rowOptions.header ?? false;

    rowValues.forEach((value, i) => {
      const cell = document.createElement('div');
      const span = rowOptions.colSpan?.[i];
      const isSelectedSort = rowOptions.sortState?.index === i;
      if (isSelectedSort && rowOptions.sortState?.sortSelectedClass) {
        cell.className += ` ${rowOptions.sortState.sortSelectedClass}`;
      }
      if (isSelectedSort && rowOptions.sortState?.directionLabel) {
        if (value instanceof HTMLElement) {
          value.appendChild(document.createTextNode(` ${rowOptions.sortState.directionLabel}`));
        } else {
          value = `${value} ${rowOptions.sortState.directionLabel}`;
        }
      }

      if (span && span > 1) {
        cell.style.gridColumn = `span ${span}`;
      }

      const shouldTruncate =
        !isHeader || (typeof value === 'string' && value.length > 0) || typeof value === 'number';

      const align = rowOptions.align?.[i] ?? 'left';
      cell.className =
        'min-w-0 ' +
        (shouldTruncate ? 'truncate ' : 'overflow-visible ') +
        (align === 'right'
          ? 'text-right tabular-nums'
          : align === 'center'
            ? 'text-center'
            : 'text-left'
        );

      if (isHeader) {
        cell.className += ' text-xs text-muted-foreground font-semibold pb-1 tracking-wide whitespace-nowrap';
      }
      // Apply font-mono to all non-header data values
      else if (i > 0) {
        cell.className += ' font-mono';
      } else {
        // Add emphasis to all first-column values (e.g. region names for commuters view)
        cell.className += ' font-medium text-foreground/90';
      }

      if (rowOptions.borderBottom) {
        cell.className += ' border-b border-border/30';
      }


      // Advance index for spans
      if (span && span > 1) {
        i += span - 1;
      }

      if (rowOptions.onClick && rowOptions.onClick[i]) {
        cell.className += ' cursor-pointer hover:text-foreground';
        cell.addEventListener('click', rowOptions.onClick[i]);
      }


      if (value instanceof HTMLElement) {
        cell.appendChild(value);
      } else {
        cell.textContent = String(value);
      }
      table.appendChild(cell);
    });
  }

  return table;
}