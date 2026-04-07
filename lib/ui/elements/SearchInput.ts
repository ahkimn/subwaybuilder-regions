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
  return h(Input, {
    value,
    placeholder,
    className,
    onChange: (event: Event) => {
      const target = event.target as HTMLInputElement;
      onValueChange(target.value);
    },
  });
}
