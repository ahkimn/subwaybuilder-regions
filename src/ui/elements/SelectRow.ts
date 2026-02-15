import type { createElement, ReactNode } from 'react';

export type SelectButtonConfig = {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
};

export type SelectRowStyle = {
  containerClass: string;
  baseButtonClass: string;
  activeButtonClass: string;
  inactiveButtonClass: string;
  iconWrapperClass: string;
};

export const MAX_SELECT_BUTTONS = 4;
const DEFAULT_SELECT_ROW_STYLE: SelectRowStyle = {
  containerClass: 'flex items-center gap-1 h-8',
  baseButtonClass: [
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap rounded-md font-medium',
    'transition-colors',
    'focus-visible:outline-none',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    'border border-input',
    'px-4 pl-2 pr-2 py-2 h-8',
    'text-xs',
  ].join(' '),
  activeButtonClass:
    'hover:bg-secondary-foreground/90 hover:text-secondary bg-secondary-foreground text-secondary',
  inactiveButtonClass:
    'hover:bg-accent hover:text-accent-foreground bg-primary-foreground',
  iconWrapperClass: 'mr-2',
};

export const COMPACT_SELECT_ROW_STYLE: SelectRowStyle = {
  containerClass: 'flex items-center gap-1 h-7',
  baseButtonClass: [
    'inline-flex items-center justify-center gap-1.5',
    'whitespace-nowrap rounded-md font-medium',
    'transition-colors',
    'focus-visible:outline-none',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0',
    'border border-input',
    'px-2 py-1 h-7',
    'text-[0.7rem]',
  ].join(' '),
  activeButtonClass:
    'hover:bg-secondary-foreground/90 hover:text-secondary bg-secondary-foreground text-secondary',
  inactiveButtonClass:
    'hover:bg-accent hover:text-accent-foreground bg-primary-foreground',
  iconWrapperClass: 'mr-1',
};

export function ReactSelectRow(
  h: typeof createElement,
  configsMap: Map<string, SelectButtonConfig>,
  activeId: string | null,
  id?: string | undefined,
  fullWidth: boolean = true,
  style: SelectRowStyle = DEFAULT_SELECT_ROW_STYLE,
): ReactNode {
  if (configsMap.size === 0 || configsMap.size > MAX_SELECT_BUTTONS) {
    throw new Error(
      `SelectRow must have between 1 and ${MAX_SELECT_BUTTONS} buttons but received ${configsMap.size}`,
    );
  }

  return h(
    'div',
    { id, className: style.containerClass },
    Array.from(configsMap.entries()).map(([id, cfg]) => {
      return h(
        'button',
        {
          key: id,
          type: 'button',
          className: getSelectButtonClassName(
            style,
            id === activeId,
            fullWidth,
          ),
          onClick: cfg.onSelect,
        },
        cfg.icon
          ? h('span', { className: style.iconWrapperClass }, cfg.icon)
          : null,
        cfg.label,
      );
    }),
  );
}

function getSelectButtonClassName(
  style: SelectRowStyle,
  isActive: boolean,
  fullWidth?: boolean,
): string {
  return [
    style.baseButtonClass,
    isActive ? style.activeButtonClass : style.inactiveButtonClass,
    fullWidth ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
