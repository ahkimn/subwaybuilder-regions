import type { createElement, ReactNode } from 'react';

export function Placeholder(
  h: typeof createElement,
  message: ReactNode,
): ReactNode {
  return h(
    'div',
    {
      className:
        'rounded-md border border-border/60 px-2 py-3 text-xs text-muted-foreground',
    },
    message,
  );
}
