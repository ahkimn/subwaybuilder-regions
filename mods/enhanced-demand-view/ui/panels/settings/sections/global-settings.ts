import type React from 'react';
import type { createElement } from 'react';

import {
  DOT_SCALING_TICKS,
  LabeledSlider,
} from '@lib/ui/elements/LabeledSlider';
import { LabeledSwitch } from '@lib/ui/elements/LabeledSwitch';
import { PanelSection } from '@lib/ui/elements/PanelSection';
import type { GlobalSettingsSectionParams } from '../types';

export function renderGlobalSettingsSection(
  h: typeof createElement,
  params: GlobalSettingsSectionParams,
): React.ReactNode {
  const {
    Switch,
    Label,
    settings,
    isUpdating,
    onToggleAutoAdjust,
    onResidentScalingChange,
    onWorkerScalingChange,
  } = params;

  const children: React.ReactNode[] = [
    LabeledSwitch(h, {
      Switch,
      Label,
      id: 'edv-auto-adjust-toggle',
      label: 'Auto-adjust Demand Dot Scaling',
      description:
        'Automatically scale demand dots based on city size. Disable to set manual scaling.',
      checked: settings.autoAdjustDotScaling,
      disabled: isUpdating,
      onCheckedChange: onToggleAutoAdjust,
    }),
  ];

  // Only show manual sliders when auto-adjust is disabled
  if (!settings.autoAdjustDotScaling) {
    children.push(
      h(
        'div',
        {
          key: 'sliders',
          className: 'flex flex-col gap-4 pt-1',
        },
        [
          LabeledSlider(h, {
            id: 'edv-resident-scaling',
            label: 'Resident Dot Scaling',
            description: 'Controls the size of resident demand dots on the map.',
            value: settings.residentDotScaling,
            ticks: DOT_SCALING_TICKS,
            disabled: isUpdating,
            onChange: onResidentScalingChange,
            mode: 'continuous',
          }),
          LabeledSlider(h, {
            id: 'edv-worker-scaling',
            label: 'Worker Dot Scaling',
            description: 'Controls the size of worker demand dots on the map.',
            value: settings.workerDotScaling,
            ticks: DOT_SCALING_TICKS,
            disabled: isUpdating,
            onChange: onWorkerScalingChange,
            mode: 'continuous',
          }),
        ],
      ),
    );
  }

  return PanelSection(h, 'Settings', children, 'flex flex-col gap-3');
}
