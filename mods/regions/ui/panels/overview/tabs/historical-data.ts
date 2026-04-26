import { Placeholder } from '@lib/ui/elements/Placeholder';
import type React from 'react';
import type { createElement } from 'react';

export function renderHistoricalTabContent(
  h: typeof createElement,
): React.ReactNode {
  return Placeholder(h, 'Historical data analysis is under construction.');
}
