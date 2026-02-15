import type { createElement, ReactNode } from 'react';

import { ReactCloseButton } from './CloseButton';

const HEADER_CLASS_NAMES = [
  'flex h-9 min-h-9 w-full p-1',
  'border-b border-primary/15',
  'items-center justify-between bg-primary-foreground',
]

export function ReactPanelHeader(
  h: typeof createElement,
  title: string,
  onClose: () => void,
): ReactNode {
  return h(
    'div',
    {
      className: HEADER_CLASS_NAMES.join(' '),
    },
    h('div', { className: 'flex items-center h-full w-full' }),
    h(
      'div',
      { className: 'flex items-center h-full w-full' },
      h('h1', { className: 'font-semibold whitespace-nowrap' }, title),
    ),
    h(
      'div',
      { className: 'flex items-center h-full w-full gap-1 justify-end' },
      ReactCloseButton(h, onClose),
    ),
  );
}
