import type { createElement, ReactNode } from 'react';

export function ReactSectionCard(
  h: typeof createElement,
  title: string,
  children: ReactNode[],
  className: string = 'rounded-md border border-border/60 p-3 flex flex-col gap-3',
): ReactNode {
  return h('section', { className }, [
    h('h2', { className: 'text-sm font-semibold' }, title),
    ...children,
  ]);
}
