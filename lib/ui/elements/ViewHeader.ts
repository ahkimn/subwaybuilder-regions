import type { createElement, ReactNode } from 'react';

export type ViewHeaderOptions = {
  labelClassName: string;
  rowClassName: string;
};

export const VIEW_SUB_HEADER_OPTIONS: ViewHeaderOptions = {
  labelClassName:
    'text-[0.72rem] font-semibold tracking-wide text-muted-foreground leading-none',
  rowClassName: 'flex justify-between items-center h-8',
};

export const DEFAULT_VIEW_HEADER_OPTIONS: ViewHeaderOptions = {
  labelClassName: 'text-sm font-medium',
  rowClassName: 'flex justify-between items-center text-sm font-medium h-8',
};

export function ViewHeader(
  h: typeof createElement,
  displayName: string,
  displayOptions: ViewHeaderOptions = DEFAULT_VIEW_HEADER_OPTIONS,
  otherElements: ReactNode[] = [],
): ReactNode {
  return h(
    'div',
    { className: displayOptions.rowClassName },
    h('span', { className: displayOptions.labelClassName }, displayName),
    ...otherElements,
  );
}
