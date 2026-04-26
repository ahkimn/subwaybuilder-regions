import type { EDVSettings } from '@enhanced-demand-view/core/storage/types';
import type { LabelProperties, SwitchProperties } from '@lib/ui/panels/types';
import type { ComponentType } from 'react';

export type EDVSettingsState = {
  isOpen: boolean;
  settings: EDVSettings;
  isUpdating: boolean;
};

export type EDVSettingsAction =
  | { type: 'open_overlay' }
  | { type: 'close_overlay' }
  | { type: 'settings_updated'; settings: EDVSettings }
  | { type: 'settings_loaded'; settings: EDVSettings }
  | { type: 'set_updating'; value: boolean };

export type GlobalSettingsSectionParams = {
  Switch: ComponentType<SwitchProperties>;
  Label: ComponentType<LabelProperties>;
  settings: EDVSettings;
  isUpdating: boolean;
  onToggleAutoAdjust: (checked: boolean) => void;
  onResidentScalingChange: (value: number) => void;
  onWorkerScalingChange: (value: number) => void;
};

export type SettingsOverlayParams = {
  onClose: () => void;
  globalParams: GlobalSettingsSectionParams;
};
