import type { createElement, ReactNode } from 'react';

export function PanelSection(
  h: typeof createElement,
  title: string | ReactNode,
  children: ReactNode[],
  className: string = 'rounded-md border border-border/60 p-3 flex flex-col gap-3',
): ReactNode {
  return h(
    'section',
    { className },
    h('h2', { className: 'text-lg font-semibold leading-none' }, title),
    ...children,
  );
}
