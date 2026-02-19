import type React from 'react';
import type { createElement } from 'react';

import { renderPlaceholderTab } from './render';

export function renderRidershipTabContent(
  h: typeof createElement,
): React.ReactNode {
  return renderPlaceholderTab(h, 'Ridership analysis is under construction.');
}
