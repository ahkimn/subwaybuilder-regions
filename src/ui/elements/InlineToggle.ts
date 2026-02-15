import type { AllPrimitives, Primitive } from '@shared/types';
import type { createElement, ReactNode } from 'react';

export type InlineToggleOption<T> = {
  value: Primitive;
  field: keyof T;
  label: string;
};

export function ReactInlineToggle<T extends AllPrimitives<T>>(
  h: typeof createElement,
  state: T,
  options: InlineToggleOption<T>[][],
  onClick: (state: T) => void,
): ReactNode {
  const children: ReactNode[] = [h('span', { key: 'left-bracket' }, '[')];

  options.forEach((toggleOptionBlock, blockIndex) => {
    toggleOptionBlock.forEach((toggleOption, optionIndex) => {
      const isActive = toggleOption.value === state[toggleOption.field];
      children.push(
        h(
          'span',
          {
            key: `option-${blockIndex}-${optionIndex}`,
            className: isActive
              ? 'text-foreground font-medium'
              : 'cursor-pointer hover:text-foreground',
            onClick: () => {
              const updatedState = { ...state };
              updatedState[toggleOption.field] =
                toggleOption.value as T[typeof toggleOption.field];
              onClick(updatedState);
            },
          },
          toggleOption.label,
        ),
      );

      if (optionIndex < toggleOptionBlock.length - 1) {
        children.push(
          h('span', { key: `slash-${blockIndex}-${optionIndex}` }, '/'),
        );
      }
    });

    if (blockIndex < options.length - 1) {
      children.push(h('span', { key: `divider-${blockIndex}` }, ' | '));
    }
  });

  children.push(h('span', { key: 'right-bracket' }, ']'));

  return h(
    'span',
    {
      className: 'text-[0.65rem] text-muted-foreground ml-1 whitespace-nowrap',
    },
    ...children,
  );
}
