import type { createElement, ReactNode } from 'react';

import { ChevronDownIcon, createReactIconElement } from './utils/Icons';

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
  optionClassName?: string;
  activeOptionClassName?: string;
  labelClassName?: string;
};

export const DEFAULT_SELECT_MENU_BUTTON_CLASS =
  'h-9 w-full rounded-sm border border-border/40 bg-background/70 px-2 text-sm text-foreground ' +
  'inline-flex items-center justify-between gap-2';

// By default, begin overscroll at around five items
export const DEFAULT_SELECT_MENU_MENU_CLASS =
  'absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-auto overscroll-contain rounded-sm border border-border/40 bg-background shadow-lg';

export const DEFAULT_SELECT_MENU_OPTION_CLASS =
  'w-full px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent';

export const DEFAULT_SELECT_MENU_ACTIVE_OPTION_CLASS = 'bg-accent/60';

export const DEFAULT_SELECT_MENU_LABEL_CLASS =
  'truncate text-left text-inherit';

export const COMPACT_SELECT_MENU_BUTTON_CLASS =
  'h-8 w-full rounded-md border border-input bg-primary-foreground px-2 text-xs text-foreground ' +
  'inline-flex items-center justify-between gap-2';

export const COMPACT_SELECT_MENU_OPTION_CLASS =
  'w-full px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent';

// Memo for open dropdowns to their click handlers (as there may be more than on SelectMenu open at once), to allow for proper cleanup of listeners
const OUTSIDE_POINTER_HANDLER_BY_MENU = new WeakMap<
  HTMLDetailsElement,
  (event: PointerEvent) => void
>();

function detachCloseListener(details: HTMLDetailsElement): void {
  const existingHandler = OUTSIDE_POINTER_HANDLER_BY_MENU.get(details);
  if (!existingHandler) return;
  document.removeEventListener('pointerdown', existingHandler, true);
  OUTSIDE_POINTER_HANDLER_BY_MENU.delete(details);
}

function attachCloseListener(details: HTMLDetailsElement): void {
  if (OUTSIDE_POINTER_HANDLER_BY_MENU.has(details)) {
    return;
  }

  // Detect clicks outside of this menu to close it when open
  const outsidePointerHandler = (event: PointerEvent) => {
    if (!details.isConnected) {
      detachCloseListener(details);
      return;
    }

    // If click is within the menu, do nothing
    const target = event.target as Node | null;
    if (target && details.contains(target)) {
      return;
    }

    // If click was outside of the menu, close it and remove the listener
    details.removeAttribute('open');
    detachCloseListener(details);
  };

  document.addEventListener('pointerdown', outsidePointerHandler, true);
  OUTSIDE_POINTER_HANDLER_BY_MENU.set(details, outsidePointerHandler);
}

// UI element for dropdown select menus
export function SelectMenu({
  h,
  value,
  options,
  placeholder,
  onValueChange,
  disabled = false,
  buttonClassName = DEFAULT_SELECT_MENU_BUTTON_CLASS,
  menuClassName = DEFAULT_SELECT_MENU_MENU_CLASS,
  optionClassName = DEFAULT_SELECT_MENU_OPTION_CLASS,
  activeOptionClassName = DEFAULT_SELECT_MENU_ACTIVE_OPTION_CLASS,
  labelClassName = DEFAULT_SELECT_MENU_LABEL_CLASS,
}: SelectMenuParams): ReactNode {
  const selectedOption =
    options.find((option) => option.value === value) ?? null;
  const displayLabel = selectedOption?.label ?? placeholder;

  if (disabled) {
    return h(
      'div',
      { className: `${buttonClassName} opacity-70` },
      h('span', { className: labelClassName }, displayLabel),
    );
  }

  return h(
    'details',
    {
      className: 'relative w-full',
      // Attach a listener to detect clicks outside the menu when it is opened, and remove the listener when closed
      onToggle: (event: Event) => {
        const currentTarget = event.currentTarget as HTMLDetailsElement;
        if (currentTarget.open) {
          // Listener to close the dropdown when the user clicks outside of it
          attachCloseListener(currentTarget);
          return;
        }
        detachCloseListener(currentTarget);
      },
      // Handle expected auto-close behavior for navigation outside of pointer events (e.g. keyboard navigation) by closing the menu when focus leaves
      onBlur: (event: FocusEvent) => {
        const currentTarget = event.currentTarget as HTMLElement;
        const relatedTarget = event.relatedTarget as Node | null;

        // Keep dropdown open while focus moves within this SelectMenu; close when focus leaves.
        if (relatedTarget && currentTarget.contains(relatedTarget)) {
          return;
        }

        currentTarget.removeAttribute('open');
      },
    },
    h(
      'summary',
      {
        className: `${buttonClassName} cursor-pointer list-none [&::-webkit-details-marker]:hidden`,
      },
      h('span', { className: labelClassName }, displayLabel),
      createReactIconElement(h, ChevronDownIcon, {
        size: 14,
        className: 'h-3.5 w-3.5 shrink-0 text-muted-foreground',
      }),
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
            className: `${optionClassName} ${
              option.value === value ? activeOptionClassName : 'bg-transparent'
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
  );
}
