import { EDV_SETTINGS_MAIN_MENU_COMPONENT_ID } from '@enhanced-demand-view/core/constants';
import { EDVStorage } from '@enhanced-demand-view/core/storage/EDVStorage';
import { EDVSettingsPanel } from '@enhanced-demand-view/ui/panels/settings/EDVSettingsPanel';

const api = window.SubwayBuilderAPI;

export class EnhancedDemandViewMod {
  private storage: EDVStorage;

  constructor() {
    this.storage = new EDVStorage();
  }

  async initialize() {
    console.log('[EnhancedDemandView] Initializing Mod');

    if (!api) {
      console.error('[EnhancedDemandView] API not available');
      return;
    }

    // Initialize settings from electron store
    const settings = await this.storage.initialize();
    console.log('[EnhancedDemandView] Settings loaded', settings);

    // Listen for settings changes
    this.storage.listen((nextSettings) => {
      console.log('[EnhancedDemandView] Settings changed', nextSettings);
      // TODO: Propagate scaling changes to demand dot rendering
    });

    // Register settings panel on the main menu
    api.ui.registerComponent('main-menu', {
      id: EDV_SETTINGS_MAIN_MENU_COMPONENT_ID,
      component: EDVSettingsPanel({ api, storage: this.storage }),
    });

    // Register lifecycle hooks
    api.hooks.onCityLoad((cityCode: string) => this.onCityLoad(cityCode));
    api.hooks.onMapReady((map: maplibregl.Map) => this.onMapReady(map));
    api.hooks.onGameEnd(() => this.onGameEnd());
  }

  async onCityLoad(cityCode: string) {
    console.log(`[EnhancedDemandView] City loaded: ${cityCode}`);
  }

  onMapReady(_map: maplibregl.Map) {
    console.log('[EnhancedDemandView] Map ready');
  }

  onGameEnd() {
    console.log('[EnhancedDemandView] Game ended');
    this.reattachMainMenuEntry();
  }

  /**
   * Unregister then re-register the settings panel on the main menu.
   * The game tears down registered components when a session ends,
   * so we need to provide a fresh React component instance.
   */
  private reattachMainMenuEntry(): void {
    if (!api) return;

    try {
      api.ui.unregisterComponent(
        'main-menu',
        EDV_SETTINGS_MAIN_MENU_COMPONENT_ID,
      );
    } catch (error) {
      console.warn(
        `[EnhancedDemandView] Swallowing error ${error}. No existing settings menu component to unregister`,
      );
    }

    api.ui.registerComponent('main-menu', {
      id: EDV_SETTINGS_MAIN_MENU_COMPONENT_ID,
      component: EDVSettingsPanel({ api, storage: this.storage }),
    });

    console.log('[EnhancedDemandView] Main menu entry reattached');
  }
}

// Instantiate and initialize
const mod = new EnhancedDemandViewMod();
mod.initialize();
