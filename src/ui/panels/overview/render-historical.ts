import type React from 'react';
import type { createElement } from 'react';

import { Placeholder } from '../../elements/Placeholder';

export function renderHistoricalTabContent(
  h: typeof createElement,
): React.ReactNode {
  return Placeholder(h, 'Historical data analysis is under construction.');
}
