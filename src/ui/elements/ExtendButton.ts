import type { createElement, ReactNode } from 'react';

import { ReactButton } from './ReactButton';
import { ChevronDownIcon, ChevronUpIcon } from './utils/Icons';

export function ReactExtendButton(
  h: typeof createElement,
  direction: 'Expand' | 'Collapse',
  nRows: number,
  onClick: () => void,
): ReactNode {
  const text = `${direction === 'Expand' ? 'Show' : 'Hide'} (${nRows} Row${nRows > 1 ? 's' : ''})`;
  return ReactButton(h, {
    label: text,
    onClick,
    icon: direction === 'Expand' ? ChevronDownIcon : ChevronUpIcon,
    iconPlacement: 'end',
    wrapperClassName: 'w-fit',
    buttonClassName:
      'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ' +
      'transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ' +
      'hover:bg-accent rounded-md px-3 mt-1 h-7 text-xs text-muted-foreground hover:text-foreground',
    iconOptions: { size: 12, className: 'ml-1 h-3 w-3' },
  });
}
