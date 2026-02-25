import type { createElement, ReactNode } from 'react';

import type { IconDefinition, IconRenderOptions } from './utils/Icons';
import { createReactIconElement } from './utils/Icons';

export type ButtonRole = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md';

export type ButtonOptions = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  role?: ButtonRole;
  size?: ButtonSize;
  ariaLabel?: string;
  tooltipText?: string;
  icon?: IconDefinition;
  iconPlacement?: 'start' | 'end';
  iconOptions?: IconRenderOptions;
  wrapperClassName?: string;
  buttonClassName?: string;
  labelClassName?: string;
};

const DEFAULT_WRAPPER_CLASS_NAME = 'flex items-center h-full w-fit';
const BUTTON_BASE_CLASS_NAME =
  'inline-flex items-center justify-center gap-1.5 rounded-sm font-medium transition-colors';
const BUTTON_ROLE_CLASS_NAMES: Record<ButtonRole, string> = {
  primary: 'border border-border bg-background hover:bg-accent',
  secondary: 'border border-border/40 bg-background/70 hover:bg-accent',
  danger: 'bg-red-600 text-white hover:bg-red-700',
} as const;
const BUTTON_SIZE_CLASS_NAMES: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-2 py-1 text-sm',
  md: 'px-3 py-1.5 text-sm',
} as const;
const DEFAULT_LABEL_CLASS_NAME = 'flex-shrink-0';

export function Button(
  h: typeof createElement,
  options: ButtonOptions,
): ReactNode {
  const {
    label,
    onClick,
    disabled = false,
    role = 'primary',
    size = 'sm',
    ariaLabel,
    tooltipText,
    icon,
    iconPlacement = 'start',
    iconOptions,
    wrapperClassName = DEFAULT_WRAPPER_CLASS_NAME,
    buttonClassName,
    labelClassName = DEFAULT_LABEL_CLASS_NAME,
  } = options;

  const resolvedButtonClassName = buttonClassName
    ? buttonClassName
    : `${BUTTON_BASE_CLASS_NAME} ${BUTTON_ROLE_CLASS_NAMES[role]} ${BUTTON_SIZE_CLASS_NAMES[size]}`;

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
        className: `${resolvedButtonClassName} disabled:opacity-50 disabled:cursor-not-allowed`,
        'aria-label': ariaLabel ?? label,
        title: tooltipText,
        disabled,
        onClick,
      },
      children,
    ),
  );
}
