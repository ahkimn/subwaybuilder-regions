import type React from "react";
import { createElement } from "react";

export type ReactSelectRowOption = {
  id: string;
  label: string;
  onSelect: () => void;
};

export function ReactPanelSelect(h: typeof createElement,
  options: ReactSelectRowOption[],
  activeId: string | null,
  id?: string,
  fullWidth?: boolean): React.ReactNode {
  const baseClass = [
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap rounded-md font-medium',
    'transition-colors',
    'focus-visible:outline-none',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    'border border-input',
    'px-4 pl-2 pr-2 py-2 h-8',
    'text-xs'
  ].join(' ');

  // Style classes for active/inactive states.
  const activeClass = 'hover:bg-secondary-foreground/90 hover:text-secondary bg-secondary-foreground text-secondary'
  const inactiveClass = 'hover:bg-accent hover:text-accent-foreground bg-primary-foreground';

  return h(
    "div",
    { id, className: "flex items-center gap-1 h-8" },
    ...options.map((option) => {
      const isActive = option.id === activeId;
      return h(
        "button",
        {
          key: option.id,
          type: "button",
          className: [
            baseClass,
            fullWidth ? 'w-full' : '',
            isActive ? activeClass : inactiveClass,
          ].join(" "),
          onClick: option.onSelect,
        },
        option.label
      );
    })
  );
}
