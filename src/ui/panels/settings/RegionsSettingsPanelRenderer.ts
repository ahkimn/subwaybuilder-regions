import { REGIONS_SETTINGS_MAIN_MENU_COMPONENT_ID } from '../../../core/constants';
import type { RegionDatasetRegistry } from '../../../core/registry/RegionDatasetRegistry';
import type { RegionsSettingsStore } from '../../../core/settings/RegionsSettingsStore';
import type { ModdingAPI } from '../../../types/modding-api-v1';
import type { RegionsPanelRenderer } from '../types';
import { RegionsSettingsPanel } from './RegionsSettingsPanel';

export class RegionsSettingsPanelRenderer implements RegionsPanelRenderer {
  private initialized = false;

  constructor(
    private readonly api: ModdingAPI,
    private readonly settingsStore: RegionsSettingsStore,
    private readonly datasetRegistry: RegionDatasetRegistry,
  ) {}

  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.reattachMainMenuComponent();
  }

  tearDown(): void {
    if (!this.initialized) {
      return;
    }
    this.api.ui.unregisterComponent(
      'main-menu',
      REGIONS_SETTINGS_MAIN_MENU_COMPONENT_ID,
    );
    this.initialized = false;
  }

  isVisible(): boolean {
    return this.initialized;
  }

  reattachMainMenuComponent(): void {
    if (!this.initialized) {
      this.initialize();
      return;
    }
    this.attachMainMenuComponent();
  }

  tryUpdatePanel(): void {
    if (!this.initialized) {
      return;
    }
    this.api.ui.forceUpdate();
  }

  private attachMainMenuComponent(): void {
    // Avoid re-registering the main menu component if the panel already exists.
    // Swallowing this keeps startup/game-end reattach idempotent.
    try {
      this.api.ui.unregisterComponent(
        'main-menu',
        REGIONS_SETTINGS_MAIN_MENU_COMPONENT_ID,
      );
    } catch (error) {
      console.warn(
        `[Regions] Swallowing error ${error}. No existing settings menu component to unregister, proceeding to register new component`,
      );
    }

    this.api.ui.registerComponent('main-menu', {
      id: REGIONS_SETTINGS_MAIN_MENU_COMPONENT_ID,
      component: RegionsSettingsPanel({
        api: this.api,
        settingsStore: this.settingsStore,
        datasetRegistry: this.datasetRegistry,
      }),
    });

    this.initialized = true;
  }
}
