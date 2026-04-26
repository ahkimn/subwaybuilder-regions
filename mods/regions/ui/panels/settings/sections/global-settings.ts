import { LabeledSwitch } from '@lib/ui/elements/LabeledSwitch';
import { PanelSection } from '@lib/ui/elements/PanelSection';
import type React from 'react';
import type { createElement } from 'react';

import type { GlobalSettingsSectionParams } from '../types';

// Renders the "Global Settings" section near the top of the settings menu
export function renderGlobalSettingsSection(
  h: typeof createElement,
  params: GlobalSettingsSectionParams,
): React.ReactNode {
  const {
    Switch,
    Label,
    settings,
    isUpdating,
    onToggleShowUnpopulatedRegions,
  } = params;

  return PanelSection(
    h,
    'Global Settings',
    [
      LabeledSwitch(h, {
        Switch,
        Label,
        id: 'regions-show-unpopulated-toggle',
        label: 'Show unpopulated regions',
        description:
          'Include regions without demand in map labels and table data.',
        checked: settings.showUnpopulatedRegions,
        disabled: isUpdating,
        onCheckedChange: onToggleShowUnpopulatedRegions,
      }),
    ],
    'flex flex-col gap-3',
  );
}
