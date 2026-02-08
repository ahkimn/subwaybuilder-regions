export type DataRowOptions = {
  header?: boolean;
  align?: ('left' | 'right' | 'center')[];
};

export function DataTable(
  columnTemplate: string,
  tableValues: Array<{ rowValues: Array<string | number>, options?: DataRowOptions }>,
): HTMLElement {

  const table = document.createElement('div');
  table.className = 'grid gap-y-1 text-sm min-w-0';
  table.style.gridTemplateColumns = columnTemplate;


  for (const { rowValues, options } of tableValues) {
    const rowOptions = options ?? {};
    let isHeader = rowOptions.header ?? false;

    rowValues.forEach((value, i) => {
      const cell = document.createElement('div');

      const align = rowOptions.align?.[i] ?? 'left';
      cell.className =
        'min-w-0 truncate' +
          align === 'right'
          ? 'text-right tabular-nums'
          : align === 'center'
            ? 'text-center'
            : 'text-left';

      if (isHeader) {
        cell.className += ' text-muted-foreground font-medium border-b border-border/40 pb-1';
      }

      cell.textContent = String(value);
      table.appendChild(cell);
    });
  }

  return table;
}