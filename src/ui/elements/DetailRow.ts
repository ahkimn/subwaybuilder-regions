export function DetailRow(label: string, value: string | number) {
  const row = document.createElement('div');
  row.className = 'flex justify-between items-baseline text-xs';

  row.innerHTML = `
    <span class="text-muted-foreground truncate">${label}</span>
    <span class="font-medium tabular-nums">${value}</span>
  `;
  return row;
}