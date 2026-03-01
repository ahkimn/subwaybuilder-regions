import type React from 'react';
import type { createElement } from 'react';

import { Placeholder } from '../../../elements/Placeholder';

export function renderRidershipTabContent(
  h: typeof createElement,
): React.ReactNode {
  return Placeholder(h, 'Ridership analysis is under construction.');
}
