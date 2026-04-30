import { EDV_SETTINGS_MAIN_MENU_COMPONENT_ID } from '@enhanced-demand-view/core/constants';
import { EDVStorage } from '@enhanced-demand-view/core/storage/EDVStorage';
import type { DemandHoverSuppressor } from '@enhanced-demand-view/map/DemandHoverSuppressor';
import { DemandLayerManager } from '@enhanced-demand-view/map/DemandLayerManager';
import { MapListenerWatcher } from '@enhanced-demand-view/map/MapListenerWatcher';
import { EDVSettingsPanel } from '@enhanced-demand-view/ui/panels/settings/EDVSettingsPanel';
import { ModLifecycle } from '@lib/lifecycle/ModLifecycle';

const api = window.SubwayBuilderAPI;

export class EnhancedDemandViewMod {
  private storage: EDVStorage;
  private lifecycle!: ModLifecycle;
  private demandLayerManager: DemandLayerManager | null = null;
  private demandHoverSuppressor: DemandHoverSuppressor | null = null;
  private mapListenerWatcher: MapListenerWatcher | null = null;

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

    // Wire game lifecycle hooks
    this.lifecycle = new ModLifecycle(api, {
      logPrefix: '[EnhancedDemandView]',
      onActivate: ({ cityCode, map }) => {
        console.log(`[EnhancedDemandView] Activated for city: ${cityCode}`);
        // Diagnostic: watch for handler pollution (game re-registering listeners
        // on demand view open/close). Logs additions/removals + periodic counts.
        this.mapListenerWatcher = new MapListenerWatcher(map);
        this.mapListenerWatcher.start();
        // Option B (DemandHoverSuppressor) is intentionally not invoked here:
        // the deck.gl _updateHover handler is map-level and services all deck.gl
        // layers in the game, so removing it breaks unrelated layer interactivity.
        // The trigger gate in DemandLayerManager already eliminates the wasteful
        // setProps work for our hidden demand-points layer.
        // Option C: replace the game's deck.gl layer with a native circle layer.
        this.demandLayerManager = new DemandLayerManager(map);
        this.demandLayerManager.attach();
      },
      onDeactivate: (cityCode) => {
        console.log(`[EnhancedDemandView] Deactivated for city: ${cityCode}`);
        this.demandLayerManager?.detach();
        this.demandLayerManager = null;
        this.demandHoverSuppressor?.restore();
        this.demandHoverSuppressor = null;
        this.mapListenerWatcher?.stop();
        this.mapListenerWatcher = null;
      },
      onGameEnd: () => {
        console.log('[EnhancedDemandView] Game ended');
        this.reattachMainMenuEntry();
      },
    });

    this.lifecycle.register();
    // Reconcile immediately — handles hot-reload where hooks do not replay
    this.lifecycle.reconcile();
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
