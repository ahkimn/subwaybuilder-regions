import type { createElement, ReactNode } from 'react';

type SelectMenuOption = {
  value: string;
  label: string;
};

type SelectMenuParams = {
  h: typeof createElement;
  value: string;
  options: SelectMenuOption[];
  placeholder: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  buttonClassName?: string;
  menuClassName?: string;
};

const DEFAULT_BUTTON_CLASS =
  'h-9 w-full rounded-sm border border-border/40 bg-background/70 px-2 text-sm text-foreground ' +
  'inline-flex items-center justify-between gap-2';

// By default, begin overscroll at around five items
const DEFAULT_MENU_CLASS =
  'absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-auto overscroll-contain rounded-sm border border-border/40 bg-background shadow-lg';

// UI element for dropdown select menus
export function SelectMenu({
  h,
  value,
  options,
  placeholder,
  onValueChange,
  disabled = false,
  buttonClassName = DEFAULT_BUTTON_CLASS,
  menuClassName = DEFAULT_MENU_CLASS,
}: SelectMenuParams): ReactNode {
  const selectedOption =
    options.find((option) => option.value === value) ?? null;
  const displayLabel = selectedOption?.label ?? placeholder;

  if (disabled) {
    return h('div', { className: `${buttonClassName} opacity-70` }, [
      h('span', { className: 'truncate text-left' }, displayLabel),
    ]);
  }

  return h('details', { className: 'relative w-full' }, [
    h(
      'summary',
      {
        className: `${buttonClassName} cursor-pointer list-none [&::-webkit-details-marker]:hidden`,
      },
      [
        h('span', { className: 'truncate text-left' }, displayLabel),
        h('span', { className: 'shrink-0 text-xs text-muted-foreground' }, '▾'),
      ],
    ),
    h(
      'div',
      { className: menuClassName },
      options.map((option) =>
        h(
          'button',
          {
            key: option.value,
            type: 'button',
            className: `w-full px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
              option.value === value ? 'bg-accent/60' : 'bg-transparent'
            }`,
            onClick: (event: Event) => {
              const target = event.currentTarget as HTMLElement;
              const details = target.closest('details');
              onValueChange(option.value);
              details?.removeAttribute('open');
            },
          },
          option.label,
        ),
      ),
    ),
  ]);
}
