
import { RegionDatasetRegistry } from '../core/registry/RegionDatasetRegistry';
import { RegionsMapLayers } from '../map/RegionsMapLayers';
import { RegionsUIManager } from '../ui/RegionsUIManager';

const SERVE_URL = 'http://127.0.0.1:8080/'
const INDEX_FILE = `${SERVE_URL}/index.json`;

const api = window.SubwayBuilderAPI;

export class RegionsMod {

  private registry: RegionDatasetRegistry;
  private currentCityCode: string | null = null;
  private map: maplibregl.Map | null = null;

  private mapLayers: RegionsMapLayers | null = null;
  private uiManager: RegionsUIManager | null = null;

  constructor() {
    this.registry = new RegionDatasetRegistry(INDEX_FILE, SERVE_URL);
  }

  async initialize() {
    console.log("[Regions] Initializing Mod");

    if (!api) {
      console.error("[Regions] API not available");
      return;
    }

    // Build dataset registry from data index file. 
    // TODO: replace with local mod storage
    await this.registry.build();

    api.hooks.onCityLoad(this.onCityLoad.bind(this));
    api.hooks.onMapReady(this.onMapReady.bind(this));

    console.log("[Regions] Mod Initialized");
  }

  private onMapReady = (map: maplibregl.Map) => {
    this.mapLayers = new RegionsMapLayers(map);
    this.uiManager = new RegionsUIManager(api, this.mapLayers, this.registry);

    console.log("[Regions] Map Layers and UI Manager initialized");

    this.uiManager.initialize();

    this.map = map;

    if (this.currentCityCode) {
      this.activateCity(this.currentCityCode);
    }
  }

  private onCityLoad = async (cityCode: string) => {
    // TODO (Issue 2): Add mechanism to determine BoundaryBox from SubwayBuilderAPI for dynamic generation of datasets
    if (this.currentCityCode) {
      this.deactivateCity();
    }
    console.log(`[Regions] Loading data for city: ${cityCode}`);
    // This is async but we do not want to block the main thread. The UI will show a loading state
    this.registry.loadCityDatasets(cityCode, () => {
      api.ui.showNotification(`[Regions] City data loaded for: ${this.registry.getCityDatasets(cityCode).map(d => d.displayName).join(', ')}`, "success");
      this.currentCityCode = cityCode;
      if (this.map) {
        this.activateCity(cityCode);
      }
    });
    api.ui.showNotification("[Regions] City data loading", "info");
  }

  // Activate city datasets in map layers and UI. Should only be called once per city
  private activateCity(cityCode: string) {
    if (!this.mapLayers || !this.uiManager) {
      // Unexpected state. Both should be initialized in onMapReady before this is called.
      console.error("[Regions] Cannot activate city: Map layers or UI manager not initialized");
      return;
    };

    const demandData = api.gameState.getDemandData();
    if (!demandData) {
      console.warn("[Regions] Demand data not available on demand change");
      return;
    }

    const datasets = this.registry.getCityDatasets(cityCode);
    if (datasets.length === 0) {
      console.warn("[Regions] No region data available for current city");
      return;
    }

    datasets.forEach(dataset => dataset.updateWithDemandData(demandData));

    this.uiManager!.onCityChange(cityCode, datasets);
    this.mapLayers!.observeMapLayersForDatasets(datasets);
  }

  private deactivateCity() {

    const cityDatasets = this.registry.getCityDatasets(this.currentCityCode!);
    for (const dataset of cityDatasets) {
      dataset.clearData();
    }

    this.mapLayers?.reset();
    this.uiManager?.reset();

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
}

// Initialize mod
const mod = new RegionsMod();
(window as any).SubwayBuilderRegions = {
  debug: {
    printRegistry: () => mod.printRegistry(),
    getCurrentCityCode: () => mod.getCurrentCityCode(),
    getActiveSelection: () => mod.getActiveSelection(),
  }
}
mod.initialize();
