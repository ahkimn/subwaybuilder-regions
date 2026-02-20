import type React from 'react';
import type { createElement } from 'react';

import { renderInfoPlaceholder } from '../shared/info-placeholder';

export function renderRidershipTabContent(
  h: typeof createElement,
): React.ReactNode {
  return renderInfoPlaceholder(h, 'Ridership analysis is under construction.');
}
