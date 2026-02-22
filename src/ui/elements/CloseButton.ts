import type { createElement, ReactNode } from 'react';

import { ReactButton } from './ReactButton';
import { CloseIcon } from './utils/Icons';

export function ReactCloseButton(
  h: typeof createElement,
  onClick: () => void,
): ReactNode {
  return ReactButton(h, {
    label: 'Close',
    ariaLabel: 'Close',
    onClick,
    icon: CloseIcon,
    wrapperClassName: 'flex items-center h-full w-fit',
    buttonClassName:
      'inline-flex items-center justify-center h-6 w-6 p-0.5 ml-auto ' +
      'rounded-md hover:bg-accent hover:text-accent-foreground',
    labelClassName: 'sr-only',
    iconOptions: { size: 16, className: 'h-4 w-4' },
  });
}
