import type React from 'react';
import type { createElement } from 'react';

import { PanelSection } from '../../elements/PanelSection';
import type { LabelProperties, SwitchProperties } from '../types';
import type { GlobalSettingsSectionParams } from './types';

// Renders the "Global Settings" section near the top of the settings menu
export function renderGlobalSettingsSection(
  h: typeof createElement,
  Switch: React.ComponentType<SwitchProperties>,
  Label: React.ComponentType<LabelProperties>,
  params: GlobalSettingsSectionParams,
): React.ReactNode {
  const { settings, isUpdating, onToggleShowUnpopulatedRegions } = params;
  const toggleId = 'regions-show-unpopulated-toggle';

  return PanelSection(
    h,
    'Global Settings',
    [
      h(
        'div',
        { className: 'flex items-start justify-between gap-3 text-sm' },
        [
          // TODO: Let's make the Label + description + switch into a reusable component since we'll introduce additional toggles in the near future
          // Toggle for showing unpopulated regions
          h('div', { className: 'flex flex-col gap-0.5' }, [
            h(
              Label,
              {
                htmlFor: toggleId,
                className: 'font-medium text-foreground',
              },
              'Show unpopulated regions',
            ),
            h(
              'span',
              { className: 'text-xs text-muted-foreground' },
              'Include regions without demand in map labels and table data.',
            ),
          ]),
          h(Switch, {
            id: toggleId,
            checked: settings.showUnpopulatedRegions,
            disabled: isUpdating,
            onCheckedChange: onToggleShowUnpopulatedRegions,
            onChange: (event: Event) => {
              const target = event.target as HTMLInputElement;
              onToggleShowUnpopulatedRegions(Boolean(target.checked));
            },
          }),
        ],
      ),
    ],
    'flex flex-col gap-3',
  );
}
