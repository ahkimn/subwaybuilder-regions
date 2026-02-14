import { DATA_INDEX_FILE, DEFAULT_PORT, DEFAULT_URL } from '@shared/consts';

import { REGIONS_DESELECT_KEY } from '../core/constants';
import { RegionDatasetRegistry } from '../core/registry/RegionDatasetRegistry';
import { RegionsMapLayers } from '../map/RegionsMapLayers';
import { RegionsUIManager } from '../ui/RegionsUIManager';

const SERVE_URL = `http://${DEFAULT_URL}:${DEFAULT_PORT}/`;
const INDEX_FILE = `${DATA_INDEX_FILE}`;

const api = window.SubwayBuilderAPI;

export class RegionsMod {
  private registry: RegionDatasetRegistry;
  private currentCityCode: string | null = null;

  private mapLayers: RegionsMapLayers | null = null;

  private uiManager: RegionsUIManager | null = null;

  // TODO (Bug 2): These are guards against unexpected states; however, full hot-reload support will require more robust handling of these edge cases.
  private cityLoadToken = 0;
  private mapInitialized = false;

  constructor() {
    this.registry = new RegionDatasetRegistry(INDEX_FILE, SERVE_URL);
  }

  async initialize() {
    console.log('[Regions] Initializing Mod');

    if (!api) {
      console.error('[Regions] API not available');
      return;
    }

    // Build dataset registry from data index file.
    // TODO (Future): replace with local mod storage
    await this.registry.build(() => {
      console.error('[Regions] Failed to load dataset index');
      api.ui.showNotification(
        '[Regions] Failed to load region data index. Please ensure local data is being served.',
        'error',
      );
    });

    api.hooks.onCityLoad(this.onCityLoad.bind(this));
    api.hooks.onMapReady(this.onMapReady.bind(this));

    console.log('[Regions] Mod Initialized');
  }

  private onMapReady = (map: maplibregl.Map | null) => {
    const resolvedMap = map ?? api.utils.getMap();

    if (!resolvedMap) {
      console.warn('[Regions] onMapReady called without a map instance');
      return;
    }

    if (!this.mapInitialized) {
      this.mapInitialized = true;
      this.mapLayers = new RegionsMapLayers(resolvedMap);
      this.uiManager = new RegionsUIManager(api, this.mapLayers, this.registry);

      console.log('[Regions] Map Layers and UI Manager initialized');

      this.uiManager.initialize();

      window.addEventListener('keydown', (event) => {
        if (event.key !== REGIONS_DESELECT_KEY) return;
        this.uiManager?.handleDeselect();
      });

      if (this.currentCityCode) {
        this.activateCity(this.currentCityCode);
      }
      return;
    } else if (!this.mapLayers || !this.uiManager) {
      console.error(
        '[Regions] Rebuilding map and UI managers after unexpected missing state',
      );
      this.mapLayers = new RegionsMapLayers(resolvedMap);
      this.uiManager = new RegionsUIManager(api, this.mapLayers, this.registry);
      this.uiManager.initialize();

      if (this.currentCityCode) {
        this.activateCity(this.currentCityCode);
      }
      return;
    }

    // City transitions can provide a new map instance in onMapReady.
    // Rebind existing map-layer manager without creating new manager instances.
    this.mapLayers.setMap(resolvedMap);
    console.warn(
      '[Regions] onMapReady called with a new map instance; rebound map references',
    );
  };

  private onCityLoad = async (cityCode: string) => {
    // TODO (Issue 2): Add mechanism to determine BoundaryBox from SubwayBuilderAPI for dynamic generation of datasets
    const loadToken = ++this.cityLoadToken;
    if (this.currentCityCode) {
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
        this.activateCity(cityCode);
      }
    });
    api.ui.showNotification('[Regions] City data loading', 'info');
  };

  // Activate city datasets in map layers and UI. Should only be called once per city
  private activateCity(cityCode: string) {
    if (!this.mapLayers || !this.uiManager) {
      // Unexpected state. Both should be initialized in onMapReady before this is called.
      console.error(
        '[Regions] Cannot activate city: Map layers or UI manager not initialized',
      );
      return;
    }

    const demandData = api.gameState.getDemandData();
    if (!demandData) {
      console.warn('[Regions] Demand data not available on demand change');
      return;
    }

    const datasets = this.registry.getCityDatasets(cityCode);
    if (datasets.length === 0) {
      console.warn('[Regions] No region data available for current city');
      return;
    }

    datasets.forEach((dataset) => dataset.updateWithDemandData(demandData));

    this.uiManager!.onCityChange(cityCode);
    this.mapLayers!.observeMapLayersForDatasets(datasets);
  }

  private deactivateCity() {
    const cityDatasets = this.registry.getCityDatasets(this.currentCityCode!);
    for (const dataset of cityDatasets) {
      dataset.clearData();
    }

    this.mapLayers?.reset();
    this.uiManager?.reset();

    console.warn(
      `[Regions] Deactivated previous city data for: ${this.currentCityCode}`,
    );
    this.currentCityCode = null;
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
    getCurrentCityCode: () => mod.getCurrentCityCode(),
    getActiveSelection: () => mod.getActiveSelection(),
    tearDownUIManager: () => mod.tearDownUIManager(),
    logMapStyle: () => mod.logMapStyle(),
    logLayerOrder: () => mod.logLayerOrder(),
    logVisibleLayers: () => mod.logVisibleLayers(),
  },
};
mod.initialize();
