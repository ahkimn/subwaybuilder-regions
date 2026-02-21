import type { createElement, ReactNode } from 'react';

import { CloseIcon, createReactIconElement } from './utils/Icons';

export function ReactCloseButton(
  h: typeof createElement,
  onClick: () => void,
): ReactNode {
  return h(
    'div',
    { className: 'flex items-center h-full w-fit' },
    h(
      'button',
      {
        type: 'button',
        className:
          'inline-flex items-center justify-center h-6 w-6 p-0.5 ml-auto ' +
          'rounded-md hover:bg-accent hover:text-accent-foreground',
        'aria-label': 'Close',
        onClick,
      },
      createReactIconElement(h, CloseIcon, { size: 16 }),
    ),
  );
}
