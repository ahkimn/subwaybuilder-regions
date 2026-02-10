import { REGIONS_INFO_UPDATE_REAL_INTERVAL, REGIONS_INFO_UPDATE_GAME_INTERVAL } from "../core/constants";
import { RegionDataBuilder } from "../core/datasets/RegionDataBuilder";
import { RegionDataManager } from "../core/datasets/RegionDataManager";
import { RegionDataset } from "../core/datasets/RegionDataset";
import { RegionDatasetRegistry } from "../core/registry/RegionDatasetRegistry";
import { RegionSelection, UIState } from "../core/types";
import { RegionsMapLayers } from "../map/RegionsMapLayers";
import { ModdingAPI } from "../types";
import { observeInfoPanelsRoot, observeMapLayersPanel } from "./observers/observers";
import { RegionsInfoPanelRenderer } from "./panels/info/RegionsInfoPanelRenderer";
import { injectRegionToggles } from "./map-layers/toggles";
import { resolveInfoPanelRoot } from "./resolve/resolve-info-panel";

export class RegionsUIManager {
  private infoPanelRenderer: RegionsInfoPanelRenderer;

  private regionDataBuilder: RegionDataBuilder;
  private regionDataManager: RegionDataManager;

  private lastCheckedGameTime: number = -1; // negative value indicates unchecked

  private commutersUpdateInterval: number | null = null;

  private initialized: boolean;

  layerPanelRoot: HTMLElement | null = null;
  infoPanelsRoot: HTMLElement | null = null;

  private state: UIState;

  constructor(
    private api: ModdingAPI,
    private mapLayers: RegionsMapLayers,
    private datasetRegistry: RegionDatasetRegistry,
  ) {
    this.state = new UIState();

    this.regionDataBuilder = new RegionDataBuilder(api);
    this.regionDataManager = new RegionDataManager(this.regionDataBuilder, this.datasetRegistry, api);

    this.infoPanelRenderer = new RegionsInfoPanelRenderer(
      this.state,
      this.regionDataManager,
      this.getInfoPanelRoot.bind(this),
      () => this.clearSelection()
    );

    this.initialized = false;
  }

  initialize() {
    if (this.initialized) {
      // Unexpected state. If this happens, it means 
      console.error("[Regions] UI Manager is already initialized");
      return;
    }
    this.initialized = true;

    this.mapLayers.setEvents({
      onRegionSelect: this.onRegionSelect.bind(this),
      onLayerStateSync: () => this.tryInjectLayerPanel(true),
    })

    this.mapLayers.setSelectionProvider((): RegionSelection | null => this.state.activeSelection);

    observeMapLayersPanel((panel) => {
      this.layerPanelRoot = panel;
      this.tryInjectLayerPanel();
    });

    observeInfoPanelsRoot(
      () => this.infoPanelRenderer.rootElement,
      () => this.infoPanelRenderer.tearDown()
    );
  }

  getInfoPanelRoot(): HTMLElement | null {
    if (!this.infoPanelsRoot && document.contains(this.infoPanelsRoot)) {
      return this.infoPanelsRoot;
    }

    this.infoPanelsRoot = resolveInfoPanelRoot();
    return this.infoPanelsRoot;
  }

  tryInjectLayerPanel(force: boolean = false) {

    if (!this.layerPanelRoot || !this.state.cityCode) return;
    if (!force && this.state.lastInjectedCity === this.state.cityCode) return;

    if (this.state.lastInjectedCity !== this.state.cityCode) {
      this.state.lastInjectedCity = this.state.cityCode;
    }

    const cityDatasets = this.datasetRegistry.getCityDatasets(this.state.cityCode)
    cityDatasets.forEach(ds => {
      this.mapLayers!.ensureDatasetRendered(ds);
    });
    const toggleOptions = cityDatasets.map((ds) => this.mapLayers!.getDatasetToggleOptions(ds));

    injectRegionToggles(this.layerPanelRoot, toggleOptions);
    console.log('[Regions] Layer panel UI injected');
  }

  private onRegionSelect(payload: { dataset: RegionDataset; featureId: string | number }) {
    const nextDatasetId = RegionDataset.getIdentifier(payload.dataset);
    const nextFeatureId = payload.featureId;
    const previousSelection = this.state.activeSelection;

    if (previousSelection !== null) {
      this.clearSelection();
      return;
    }

    this.state.activeSelection = { datasetId: nextDatasetId, featureId: nextFeatureId };
    this.mapLayers.updateSelection(previousSelection, this.state.activeSelection);
    this.infoPanelRenderer.showFeatureData();
  }

  get activeSelection(): RegionSelection | null {
    return this.state.activeSelection;
  }

  // TODO (Feature): Add setter for entry point into data / chart element

  // --- State Mutations --- //
  onCityChange(cityCode: string, datasets: RegionDataset[] = []) {
    this.reset();
    this.state.cityCode = cityCode;
    this.startCommutersUpdateLoop();
    this.tryInjectLayerPanel();
  }

  reset() {
    this.stopCommutersUpdateLoop();

    this.clearSelection();
  }

  private clearSelection() {
    const previousSelection = this.state.activeSelection;

    this.state.activeSelection = null;

    this.mapLayers.updateSelection(previousSelection, this.state.activeSelection);
    this.infoPanelRenderer.tearDown();
  }

  public handleDeselect() {
    if (this.state.isActive) {
      this.clearSelection();
    }
  }

  // --- Commuter Updates --- //
  private startCommutersUpdateLoop() {
    if (this.commutersUpdateInterval !== null) {
      return;
    }
    console.log('[Regions] Starting commuter data update loop...');
    this.tryUpdateCommutersData();

    this.commutersUpdateInterval = window.setInterval(() => {
      try {
        this.tryUpdateCommutersData();
      } catch (error) {
        console.error('[Regions] Error during commuter data update:', error);
      }
    }, REGIONS_INFO_UPDATE_REAL_INTERVAL * 1000);
  }

  private stopCommutersUpdateLoop() {
    if (this.commutersUpdateInterval !== null) {
      console.log('[Regions] Stopping commuter data update loop...');
      clearInterval(this.commutersUpdateInterval);
      this.commutersUpdateInterval = null;
    }
  }

  private tryUpdateCommutersData() {

    if (!this.infoPanelRenderer?.isVisible()) return;

    const elapsedSeconds = this.api.gameState.getElapsedSeconds();
    if (elapsedSeconds - this.lastCheckedGameTime < REGIONS_INFO_UPDATE_GAME_INTERVAL) {
      return;
    }

    this.updateCommutersData()
    this.lastCheckedGameTime = elapsedSeconds;
  }

  private async updateCommutersData() {

    if (await this.regionDataManager.ensureExistsData(this.state, 'commuter')) {
      this.infoPanelRenderer.tryUpdatePanel();
    }
  }
};
