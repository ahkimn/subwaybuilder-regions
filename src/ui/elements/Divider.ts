import type { createElement, ReactNode } from 'react';

export function ReactDivider(
  h: typeof createElement,
  width: number = 1,
): ReactNode {
  return h('div', { className: `border-t border-border/40 my-${width}` });
}
