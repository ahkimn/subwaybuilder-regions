export function DetailRow(label: string, value: string | number) {
  const row = document.createElement('div');
  row.className = 'flex justify-between';

  row.innerHTML = `
    <span class="text-muted-foreground">${label}</span>
    <span class="font-medium">${value}</span>
  `;
  return row;
}