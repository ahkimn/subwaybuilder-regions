import { DATA_INDEX_FILE, DEFAULT_PORT, DEFAULT_URL } from '@shared/constants';

import { REGIONS_DESELECT_KEY } from '../core/constants';
import { RegionDataset } from '../core/datasets/RegionDataset';
import { RegionDatasetRegistry } from '../core/registry/RegionDatasetRegistry';
import { DEFAULT_REGIONS_SETTINGS } from '../core/storage/defaults';
import { RegionsStorage } from '../core/storage/RegionsStorage';
import type { RegionsSettings } from '../core/storage/types';
import { RegionsMapLayers } from '../map/RegionsMapLayers';
import { RegionsUIManager } from '../ui/RegionsUIManager';

const SERVE_URL = `http://${DEFAULT_URL}:${DEFAULT_PORT}/`;
const INDEX_FILE = `${DATA_INDEX_FILE}`;

const api = window.SubwayBuilderAPI;

export class RegionsMod {
  private registry!: RegionDatasetRegistry;
  private readonly storage: RegionsStorage;
  private currentCityCode: string | null = null;

  private mapLayers: RegionsMapLayers | null = null;

  private uiManager: RegionsUIManager | null = null;
  private settings: RegionsSettings = { ...DEFAULT_REGIONS_SETTINGS };

  private cityLoadToken: number;
  private mapReadyToken: number = 0;

  constructor() {
    this.storage = new RegionsStorage();
    this.cityLoadToken = 0;
  }

  // TODO: (Feature) Add support for dynamic registry updates and remove hard-coded static index
  private async buildRegistryWithFallback(): Promise<void> {
    const { servedCount, localCount } = await this.registry.buildFromCache(
      () => {
        console.warn('[Regions] Failed to load dataset index from server');
      },
    );

    if (servedCount > 0 || localCount > 0) {
      api.ui.showNotification(
        `[Regions] Loaded ${servedCount} served and ${localCount} local datasets.`,
        'success',
      );
      return;
    }
  }

  async initialize() {
    console.log('[Regions] Initializing Mod');

    if (!api) {
      console.error('[Regions] API not available');
      return;
    }

    this.settings = await this.storage.initialize();
    this.storage.listen((nextSettings) => {
      this.applySettings(nextSettings);
    });
    this.registry = new RegionDatasetRegistry(
      api,
      INDEX_FILE,
      SERVE_URL,
      this.storage,
    );

    this.uiManager = new RegionsUIManager(
      api,
      this.registry,
      this.storage,
      this.settings,
    );

    this.uiManager.initialize();

    // Global key listener for deselection -- band-aid solution until we are able to make more targeted keybinds that do not clash with in-game
    window.addEventListener('keydown', (event) => {
      if (event.key !== REGIONS_DESELECT_KEY) return;
      this.uiManager?.handleDeselect();
    });

    api.hooks.onCityLoad(this.onCityLoad.bind(this));
    api.hooks.onMapReady(this.onMapReady.bind(this));
    api.hooks.onGameEnd(this.onGameEnd.bind(this));

    void this.buildRegistryWithFallback()
      // Handle edge case when registry fails to build before hooks are attached. This can occur on mod initialization and/or hot-reload
      .then(() => {
        // For hot reload specifically, hooks may not replay if the game is already in-city. Reconcile behavior should only occur once --  when no city load has started yet.
        if (this.cityLoadToken !== 0) {
          return;
        }

        // If map ready hook didn't replay, attach using current API map reference if it exists
        if (!this.mapLayers) {
          const mapFromApi = api.utils.getMap();
          if (mapFromApi) {
            this.onMapReady(mapFromApi);
          }
        }

        if (
          (this.currentCityCode || this.tryGetCityCode()) &&
          this.cityLoadToken === 0
        ) {
          void this.onCityLoad(this.currentCityCode!);
          return;
        }
      })
      .catch((registryBuildError) => {
        api.ui.showNotification(
          '[Regions] Failed to load region data index and local region files.',
          'error',
        );
        console.error(
          '[Regions] Failed to build registry during initialization',
          registryBuildError,
        );
      });

    console.log('[Regions] Mod Initialized');
  }

  private onMapReady = (map: maplibregl.Map | null) => {
    ++this.mapReadyToken;
    const resolvedMap = map ?? api.utils.getMap();

    if (!resolvedMap) {
      console.warn('[Regions] onMapReady called without a map instance');
      return;
    }

    if (!this.mapLayers) {
      this.mapLayers = new RegionsMapLayers(resolvedMap);
      console.log('[Regions] Map Layers initialized');
    } else {
      this.mapLayers.setMap(resolvedMap);
      console.warn(
        '[Regions] onMapReady called with a new map instance; rebound map references',
      );
    }

    this.mapLayers.setSettings(this.settings);

    if (!this.uiManager) {
      console.error('[Regions] UI Manager is missing during map attach');
      return;
    }

    this.uiManager.attachMapLayers(this.mapLayers);
    if (this.currentCityCode) {
      console.log('[Regions] Activating city data onMapReady');
      this.activateCity(this.currentCityCode);
    } else if (
      // On reload of an existing save, a new cityLoad hook may not trigger; however, we can recover the city code from a separate API call
      this.cityLoadToken === 0 &&
      this.tryGetCityCode()
    ) {
      void this.onCityLoad(this.currentCityCode!);
    }
  };

  private tryGetCityCode(): boolean {
    const cityCodeFromAPI = api.utils.getCityCode();
    console.info(
      '[Regions] Resolved city code from API: ',
      cityCodeFromAPI ? cityCodeFromAPI : 'N/A',
    );
    if (cityCodeFromAPI) {
      this.currentCityCode = cityCodeFromAPI;
      return true;
    }
    return false;
  }

  private onCityLoad = async (cityCode: string) => {
    // TODO (Issue 2): Add mechanism to determine BoundaryBox from SubwayBuilderAPI for dynamic generation of datasets
    const loadToken = ++this.cityLoadToken;
    // Unload data from previous city (if it exists or if it differs from the city to be loaded)
    if (this.currentCityCode && this.currentCityCode !== cityCode) {
      this.deactivateCity();
    }
    console.log(`[Regions] Loading data for city: ${cityCode}`);
    // This is async but we do not want to block the main thread. The UI will show a loading state
    this.registry.loadCityDatasets(cityCode, () => {
      if (loadToken !== this.cityLoadToken) {
        return;
      }
      api.ui.showNotification(
        `[Regions] City data loaded for: ${this.registry
          .getCityDatasets(cityCode)
          .map((d) => d.displayName)
          .join(', ')}`,
        'success',
      );
      this.currentCityCode = cityCode;
      if (this.mapLayers) {
        console.log('[Regions] Activating city data onCityLoad');
        this.activateCity(cityCode);
      }
    });
    api.ui.showNotification('[Regions] City data loading', 'info');
  };

  // Activate city datasets in map layers and UI. Should only be called once per city
  private activateCity(cityCode: string) {
    if (!this.uiManager) {
      console.error(
        '[Regions] Cannot activate city: UI manager not initialized',
      );
      return;
    }

    const demandData = api.gameState.getDemandData();
    if (!demandData) {
      console.warn('[Regions] Demand data not available on demand change');
      return;
    }

    const datasets = this.registry.getCityDatasets(cityCode);
    const loadedDatasets = datasets.filter((dataset) => dataset.isLoaded);
    if (loadedDatasets.length === 0) {
      console.warn(
        `[Regions] No datasets loaded for city ${cityCode}; skipping activation`,
      );
      api.ui.showNotification(
        `[Regions] No region loaded for city ${cityCode}.`,
        'warning',
      );
      return;
    }
    if (loadedDatasets.length !== datasets.length) {
      const skippedDatasets = datasets
        .filter((dataset) => !dataset.isLoaded)
        .map(
          (dataset) =>
            `${RegionDataset.getIdentifier(dataset)} (${dataset.status})`,
        );
      console.warn(
        `[Regions] Skipping unloaded datasets for city ${cityCode}: ${skippedDatasets.join(', ')}`,
      );
    }

    loadedDatasets.forEach((dataset) =>
      dataset.updateWithDemandData(demandData),
    );

    this.uiManager.onCityChange(cityCode);
    this.mapLayers?.observeMapLayersForDatasets(loadedDatasets);
  }

  private async onGameEnd(result: unknown) {
    console.log(
      '[Regions] Handling game end, clearing city data and resetting state. Result: ',
      await result,
    );

    if (this.currentCityCode) {
      this.clearCityData(this.currentCityCode);
      this.currentCityCode = null;
    }

    // Reset tokens to allow for proper reconciliation in same city-load edge cases
    this.cityLoadToken = 0;
    this.mapReadyToken = 0;
    this.mapLayers?.reset();
    this.mapLayers = null;
    this.uiManager?.onGameEnd();
  }

  // This should rarely if ever be called (only in cases where a user is able to switch cities without ending a game)
  private deactivateCity() {
    console.warn(
      `[Regions] Deactivating current city data for: ${this.currentCityCode}`,
    );
    if (!this.currentCityCode) {
      return;
    }
    this.clearCityData(this.currentCityCode);

    this.mapLayers?.reset();
    this.uiManager?.reset();

    console.warn(
      `[Regions] Deactivated previous city data for: ${this.currentCityCode}`,
    );
    this.currentCityCode = null;
  }

  private clearCityData(cityCode: string): void {
    const cityDatasets = this.registry.getCityDatasets(cityCode);
    for (const dataset of cityDatasets) {
      dataset.clearData();
    }
  }

  private applySettings(settings: RegionsSettings): void {
    this.settings = { ...settings };
    this.uiManager?.applySettings(this.settings);
  }

  printSettings() {
    console.log('[Regions] Current settings', this.settings);
  }

  // --- Debugging Helpers --- //
  printRegistry() {
    this.registry.printIndex();
  }

  getCurrentCityCode() {
    return this.currentCityCode;
  }

  getActiveSelection() {
    return this.uiManager?.activeSelection;
  }

  tearDownUIManager() {
    this.uiManager?.tearDown();
  }

  logMapStyle() {
    console.log(
      this.mapLayers
        ? this.mapLayers.getMapStyle()
        : 'Map layers not initialized',
    );
  }

  logLayerOrder() {
    console.log(
      this.mapLayers
        ? this.mapLayers.getMapLayerOrder()
        : 'Map layers not initialized',
    );
  }

  logVisibleLayers() {
    console.log(
      this.mapLayers
        ? this.mapLayers.getVisibleLayers()
        : 'Map layers not initialized',
    );
  }
}

// Initialize mod
const mod = new RegionsMod();
(window as any).SubwayBuilderRegions = {
  debug: {
    printRegistry: () => mod.printRegistry(),
    printSettings: () => mod.printSettings(),
    getCurrentCityCode: () => mod.getCurrentCityCode(),
    getActiveSelection: () => mod.getActiveSelection(),
    tearDownUIManager: () => mod.tearDownUIManager(),
    logMapStyle: () => mod.logMapStyle(),
    logLayerOrder: () => mod.logLayerOrder(),
    logVisibleLayers: () => mod.logVisibleLayers(),
  },
};
mod.initialize();
