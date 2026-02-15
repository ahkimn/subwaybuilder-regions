import type { createElement, ReactNode } from 'react';

export function buildReactViewHeader(
  h: typeof createElement,
  name: string,
): ReactNode {
  return h(
    'div',
    { className: 'flex justify-between items-center text-sm font-medium h-8' },
    h('span', { className: 'font-medium leading-none' }, name),
  );
}
