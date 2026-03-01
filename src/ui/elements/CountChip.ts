import type { createElement, ReactNode } from 'react';

type CountChipParams = {
  h: typeof createElement;
  count: number;
  label?: string;
  className?: string;
};

const DEFAULT_COUNT_CHIP_CLASS_NAME =
  'px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary';

// Small
export function CountChip({
  h,
  count,
  label = 'active',
  className = DEFAULT_COUNT_CHIP_CLASS_NAME,
}: CountChipParams): ReactNode {
  return h('span', { className }, `${count} ${label}`);
}
