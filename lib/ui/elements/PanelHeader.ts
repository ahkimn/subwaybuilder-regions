import type { createElement, ReactNode } from 'react';

import { ReactCloseButton } from './CloseButton';

const HEADER_CLASS_NAMES = [
  'flex h-9 min-h-9 w-full p-1',
  'border-b border-primary/15',
  'items-center justify-between bg-primary-foreground',
];

const DRAG_HANDLE_CLASS_NAMES =
  'cursor-grab active:cursor-grabbing select-none';

export type PanelHeaderOptions = {
  // Render the header as a drag handle (adds grab cursor + no-select)
  draggable?: boolean;
  extraProps?: Record<string, unknown>;
};

export function ReactPanelHeader(
  h: typeof createElement,
  title: string,
  onClose: () => void,
  options?: PanelHeaderOptions,
): ReactNode {
  return h(
    'div',
    {
      className: options?.draggable
        ? `${HEADER_CLASS_NAMES.join(' ')} ${DRAG_HANDLE_CLASS_NAMES}`
        : HEADER_CLASS_NAMES.join(' '),
      ...(options?.extraProps ?? {}),
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
