import type { ModdingAPI } from '@lib/types';
import {
  EDV_SETTINGS_MAIN_MENU_COMPONENT_ID,
} from '@enhanced-demand-view/core/constants';
import { EDVStorage } from '@enhanced-demand-view/core/storage/EDVStorage';
import { EDVSettingsPanel } from '@enhanced-demand-view/ui/panels/settings/EDVSettingsPanel';

const api = window.SubwayBuilderAPI as ModdingAPI | undefined;

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
    api.on('cityLoad', (cityCode: string) => this.onCityLoad(cityCode));
    api.on('mapReady', (map: unknown) => this.onMapReady(map));
    api.on('gameEnd', () => this.onGameEnd());
  }

  async onCityLoad(cityCode: string) {
    console.log(`[EnhancedDemandView] City loaded: ${cityCode}`);
  }

  onMapReady(_map: unknown) {
    console.log('[EnhancedDemandView] Map ready');
  }

  onGameEnd() {
    console.log('[EnhancedDemandView] Game ended');
  }
}

// Instantiate and initialize
const mod = new EnhancedDemandViewMod();
mod.initialize();
