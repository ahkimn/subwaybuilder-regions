import type React from 'react';
import type { createElement } from 'react';

import { renderPlaceholderTab } from './render';

export function renderHistoricalTabContent(
  h: typeof createElement,
): React.ReactNode {
  return renderPlaceholderTab(
    h,
    'Historical data analysis is under construction.',
  );
}
