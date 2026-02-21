import type { createElement, ReactNode } from 'react';

import type { IconDefinition, IconRenderOptions } from './utils/Icons';
import { createReactIconElement } from './utils/Icons';

export type ReactButtonOptions = {
  label: string;
  onClick: () => void;
  ariaLabel?: string;
  icon?: IconDefinition;
  iconPlacement?: 'start' | 'end';
  iconOptions?: IconRenderOptions;
  wrapperClassName?: string;
  buttonClassName?: string;
  labelClassName?: string;
};

const DEFAULT_WRAPPER_CLASS_NAME = 'flex items-center h-full w-fit';
const DEFAULT_BUTTON_CLASS_NAME =
  'inline-flex items-center justify-center gap-1.5 rounded-sm border border-border ' +
  'bg-background px-2 py-1 text-sm font-medium hover:bg-accent transition-colors';
const DEFAULT_LABEL_CLASS_NAME = 'flex-shrink-0';

export function ReactButton(
  h: typeof createElement,
  options: ReactButtonOptions,
): ReactNode {
  const {
    label,
    onClick,
    ariaLabel,
    icon,
    iconPlacement = 'start',
    iconOptions,
    wrapperClassName = DEFAULT_WRAPPER_CLASS_NAME,
    buttonClassName = DEFAULT_BUTTON_CLASS_NAME,
    labelClassName = DEFAULT_LABEL_CLASS_NAME,
  } = options;

  const labelElement = h('span', { className: labelClassName }, label);
  const iconElement = icon
    ? createReactIconElement(h, icon, {
        size: 16,
        className: 'h-4 w-4 shrink-0',
        ...iconOptions,
      })
    : null;

  const children: ReactNode[] = [];
  if (iconPlacement === 'start') {
    iconElement && children.push(iconElement);
    children.push(labelElement);
  } else {
    children.push(labelElement);
    iconElement && children.push(iconElement);
  }

  return h(
    'div',
    { className: wrapperClassName },
    h(
      'button',
      {
        type: 'button',
        className: buttonClassName,
        'aria-label': ariaLabel ?? label,
        onClick,
      },
      children,
    ),
  );
}
