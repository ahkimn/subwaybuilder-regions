import type { createElement, ReactNode } from 'react';

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
