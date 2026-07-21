import type React from 'react';
import type { createElement } from 'react';

export type SearchInputProps = {
  h: typeof createElement;
  Input: React.ComponentType<{
    value?: string;
    placeholder?: string;
    onChange?: (e: Event) => void;
    className?: string;
  }>;
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  className?: string;
};

export function ReactSearchInput({
  h,
  Input,
  value,
  placeholder,
  onValueChange,
  className,
}: SearchInputProps): React.ReactNode {
  // The settings menu is registered as a game `main-menu` component, so the
  // game's global key handlers are still active over it and can swallow
  // keystrokes (or preventDefault them) before the field consumes them —
  // leaving the input focused but untypeable. Stop key events from propagating
  // out of the field so the game's hotkey handling never sees them. This does
  // not touch the input's own default behaviour, so typing still works.
  const stopKeyPropagation = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  };
  return h(
    'div',
    {
      // `contents` keeps the wrapper out of layout so the field renders exactly
      // as before.
      className: 'contents',
      onKeyDown: stopKeyPropagation,
      onKeyUp: stopKeyPropagation,
    },
    h(Input, {
      value,
      placeholder,
      className,
      onChange: (event: Event) => {
        const target = event.target as HTMLInputElement;
        onValueChange(target.value);
      },
    }),
  );
}
