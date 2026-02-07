type DataRowOptions = {
  header?: boolean;
  align?: ('left' | 'right' | 'center')[];
};

export function DataRow(
  values: Array<string | number>,
  options: DataRowOptions = {}
): HTMLElement {
  const row = document.createElement('div');

  row.className = 'grid gap-2 items-center min-w-0';
  row.style.gridTemplateColumns = 'minmax(0,1fr) 6rem 6rem';

  if (options.header) {
    row.className += ' text-muted-foreground font-medium border-b border-border/40 pb-1';
  }

  values.forEach((value, i) => {
    const cell = document.createElement('div');

    const align = options.align?.[i] ?? 'left';
    cell.className =
      'min-w-0 truncate' +
        align === 'right'
        ? 'text-right tabular-nums'
        : align === 'center'
          ? 'text-center'
          : 'text-left';

    cell.textContent = String(value);
    row.appendChild(cell);
  });

  return row;
}