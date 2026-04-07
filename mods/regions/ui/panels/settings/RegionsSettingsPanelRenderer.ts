import { REGIONS_SETTINGS_MAIN_MENU_COMPONENT_ID as REGIONS_SETTINGS_MAIN_MENU_ENTRY_ID } from '@regions/core/constants';
import type { RegionDatasetRegistry } from '@regions/core/registry/RegionDatasetRegistry';
import type { RegionsStorage } from '@regions/core/storage/RegionsStorage';
import type { ModdingAPI } from '@lib/types/api';

import type { RegionsPanelRenderer } from '@lib/ui/panels/types';
import { RegionsSettingsPanel } from './RegionsSettingsPanel';

export class RegionsSettingsPanelRenderer implements RegionsPanelRenderer {
  private initialized = false;

  constructor(
    private readonly api: ModdingAPI,
    private readonly storage: RegionsStorage,
    private readonly datasetRegistry: RegionDatasetRegistry,
  ) {}

  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.registerMainMenuEntry();
  }

  tearDown(): void {
    if (!this.initialized) {
      return;
    }
    this.api.ui.unregisterComponent(
      'main-menu',
      REGIONS_SETTINGS_MAIN_MENU_ENTRY_ID,
    );
    this.initialized = false;
  }

  isVisible(): boolean {
    return this.initialized;
  }

  reattachMainMenuEntry(): void {
    this.registerMainMenuEntry();
  }

  tryUpdatePanel(): void {
    if (!this.initialized) {
      return;
    }
    this.api.ui.forceUpdate();
  }

  private registerMainMenuEntry(): void {
    // Avoid re-registering the main menu component if the panel already exists.
    try {
      this.api.ui.unregisterComponent(
        'main-menu',
        REGIONS_SETTINGS_MAIN_MENU_ENTRY_ID,
      );
    } catch (error) {
      // Swallow error to maintain idempotency of the method
      console.warn(
        `[Regions] Swallowing error ${error}. No existing settings menu component to unregister, proceeding to register new component`,
      );
    }

    this.api.ui.registerComponent('main-menu', {
      id: REGIONS_SETTINGS_MAIN_MENU_ENTRY_ID,
      component: RegionsSettingsPanel({
        api: this.api,
        storage: this.storage,
        datasetRegistry: this.datasetRegistry,
      }),
    });

    this.initialized = true;
  }
}
