import type React from 'react';
import type { createElement } from 'react';

import { renderInfoPlaceholder } from '../shared/info-placeholder';

export function renderHistoricalTabContent(
  h: typeof createElement,
): React.ReactNode {
  return renderInfoPlaceholder(h, 'Historical data analysis is under construction.');
}
