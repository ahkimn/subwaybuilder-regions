import type { createElement } from 'react';

import type { ModdingAPI } from '@lib/types';
import { getGameReact } from '@lib/ui/react/get-game-react';
import type { EDVStorage } from '@enhanced-demand-view/core/storage/EDVStorage';
import type { EDVSettings } from '@enhanced-demand-view/core/storage/types';
import {
  renderSettingsEntry,
  renderSettingsOverlay,
} from './render-sections';
import {
  createInitialEDVSettingsState,
  edvSettingsReducer,
} from './state';
import type { EDVSettingsAction, GlobalSettingsSectionParams } from './types';

type EDVSettingsPanelParams = {
  api: ModdingAPI;
  storage: EDVStorage;
};

/**
 * Factory that returns a React component for the EDV settings panel.
 *
 * Registered on the game's `main-menu` placement to appear alongside other
 * mod settings entries.
 */
export function EDVSettingsPanel(params: EDVSettingsPanelParams) {
  const { api, storage } = params;

  return () => {
    const {
      h,
      Fragment,
      useReducerHook,
      useEffectHook,
      components: { Switch, Label },
    } = getGameReact(api);

    const [state, dispatch] = useReducerHook(
      edvSettingsReducer,
      storage.getSettings(),
      createInitialEDVSettingsState,
    );

    // Subscribe to storage changes
    useEffectHook(() => {
      let mounted = true;

      // Hydrate from electron store on mount
      void storage.initialize().then((settings) => {
        if (mounted) {
          dispatch({ type: 'settings_loaded', settings });
        }
      });

      const unsubscribe = storage.listen((settings) => {
        if (mounted) {
          dispatch({ type: 'settings_updated', settings });
        }
      });

      return () => {
        mounted = false;
        unsubscribe();
      };
    }, []);

    // --- Handlers --- //

    const updateSettings = (patch: Partial<EDVSettings>) => {
      dispatch({ type: 'set_updating', value: true });
      void storage
        .updateSettings(patch)
        .then((nextSettings) => {
          dispatch({ type: 'settings_updated', settings: nextSettings });
        })
        .catch((error) => {
          console.error('[EnhancedDemandView] Failed to update settings', error);
          api.ui.showNotification(
            'Failed to save settings. See console for details.',
            'error',
          );
        })
        .finally(() => {
          dispatch({ type: 'set_updating', value: false });
        });
    };

    const onToggleAutoAdjust = (checked: boolean) => {
      updateSettings({ autoAdjustDotScaling: checked });
    };

    const onResidentScalingChange = (value: number) => {
      updateSettings({ residentDotScaling: value });
    };

    const onWorkerScalingChange = (value: number) => {
      updateSettings({ workerDotScaling: value });
    };

    // --- Render --- //

    const globalParams: GlobalSettingsSectionParams = {
      Switch,
      Label,
      settings: state.settings,
      isUpdating: state.isUpdating,
      onToggleAutoAdjust,
      onResidentScalingChange,
      onWorkerScalingChange,
    };

    return h(Fragment, null, [
      renderSettingsEntry(h, () => dispatch({ type: 'open_overlay' })),
      ...(state.isOpen
        ? [
            renderSettingsOverlay(h, {
              onClose: () => dispatch({ type: 'close_overlay' }),
              globalParams,
            }),
          ]
        : []),
    ]);
  };
}
