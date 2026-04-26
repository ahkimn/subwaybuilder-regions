import { Placeholder } from '@lib/ui/elements/Placeholder';
import type React from 'react';
import type { createElement } from 'react';

export function renderRidershipTabContent(
  h: typeof createElement,
): React.ReactNode {
  return Placeholder(h, 'Ridership analysis is under construction.');
}
