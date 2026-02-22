import type { createElement, ReactNode } from 'react';

import { ReactButton } from './ReactButton';
import { CloseIcon } from './utils/Icons';

const HEADER_CLASS_NAMES = [
  'flex h-9 min-h-9 w-full p-1',
  'border-b border-primary/15',
  'items-center justify-between bg-primary-foreground',
];

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
      ReactButton(h, {
        label: 'Close',
        ariaLabel: 'Close',
        onClick: onClose,
        icon: CloseIcon,
        wrapperClassName: 'flex items-center h-full w-fit',
        buttonClassName:
          'inline-flex items-center justify-center h-6 w-6 p-0.5 ml-auto ' +
          'rounded-md hover:bg-accent hover:text-accent-foreground',
        labelClassName: 'sr-only',
        iconOptions: { size: 16, className: 'h-4 w-4' },
      }),
    ),
  );
}
