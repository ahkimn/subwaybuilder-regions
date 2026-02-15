import type { createElement, ReactNode } from 'react';

export function DetailRow(label: string, value: string | number) {
  const row = document.createElement('div');
  row.className = 'flex justify-between items-baseline text-xs';

  row.innerHTML = `
    <span class="text-muted-foreground truncate">${label}</span>
    <span class="font-medium tabular-nums">${value}</span>
  `;
  return row;
}

export function ReactDetailRow(
  h: typeof createElement,
  label: string,
  value: string | number,
): ReactNode {
  return h(
    'div',
    { className: 'flex justify-between items-baseline text-xs' },
    h('span', { className: 'text-muted-foreground truncate' }, label),
    h('span', { className: 'font-medium tabular-nums' }, String(value)),
  );
}
