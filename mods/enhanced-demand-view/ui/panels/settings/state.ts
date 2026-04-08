import type { EDVSettings } from '@enhanced-demand-view/core/storage/types';

import type { EDVSettingsAction, EDVSettingsState } from './types';

export function edvSettingsReducer(
  state: EDVSettingsState,
  action: EDVSettingsAction,
): EDVSettingsState {
  switch (action.type) {
    case 'open_overlay':
      return { ...state, isOpen: true };
    case 'close_overlay':
      return { ...state, isOpen: false };
    case 'settings_updated':
    case 'settings_loaded':
      return { ...state, settings: action.settings };
    case 'set_updating':
      return { ...state, isUpdating: action.value };
    default:
      return state;
  }
}

export function createInitialEDVSettingsState(
  settings: EDVSettings,
): EDVSettingsState {
  return {
    isOpen: false,
    settings,
    isUpdating: false,
  };
}
