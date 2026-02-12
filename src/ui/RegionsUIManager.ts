import { REGIONS_INFO_PANEL_MOD_ID, REGIONS_INFO_UPDATE_REAL_INTERVAL, REGIONS_INFO_UPDATE_GAME_INTERVAL } from "../core/constants";
import { RegionDataBuilder } from "../core/datasets/RegionDataBuilder";
import { RegionDataManager } from "../core/datasets/RegionDataManager";
import { RegionDataset } from "../core/datasets/RegionDataset";
import { RegionDatasetRegistry } from "../core/registry/RegionDatasetRegistry";
import { RegionSelection, UIState } from "../core/types";
import { RegionsMapLayers } from "../map/RegionsMapLayers";
import type { ModdingAPI } from "../types/modding-api-v1";
import { observeInfoPanelsRoot, observeMapLayersPanel } from "./observers/observers";
import { RegionsInfoPanelRenderer } from "./panels/info/RegionsInfoPanelRenderer";
import { RegionsOverviewPanelRenderer } from "./panels/overview/RegionsOverviewPanelRenderer";
import { injectRegionToggles } from "./map-layers/toggles";
import { resolveInfoPanelRoot } from "./resolve/resolve-info-panel";

export class RegionsUIManager {
  private infoPanelRenderer: RegionsInfoPanelRenderer;
  private overviewPanelRenderer: RegionsOverviewPanelRenderer;

  private regionDataBuilder: RegionDataBuilder;
  private regionDataManager: RegionDataManager;

  private lastCheckedGameTime: number = -1; // negative value indicates unchecked

  private commutersUpdateInterval: number | null = null;

  private initialized: boolean;

  layerPanelRoot: HTMLElement | null = null;
  infoPanelsRoot: HTMLElement | null = null;

  private infoPanelsObserver: MutationObserver | null = null;
  private infoPanelsObserverRoot: HTMLElement | null = null;

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

    this.overviewPanelRenderer = new RegionsOverviewPanelRenderer(
      api,
      this.state,
      this.regionDataManager
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
    });

    this.overviewPanelRenderer.setEvents({
      onRegionSelect: (selection: RegionSelection) => this.onOverviewSelect(selection)
    })

    this.mapLayers.setSelectionProvider((): RegionSelection | null => this.state.activeSelection);

    observeMapLayersPanel((panel) => {
      this.layerPanelRoot = panel;
      this.tryInjectLayerPanel();
    });

    this.overviewPanelRenderer.initialize();
  }

  getInfoPanelRoot(): HTMLElement | null {
    if (this.infoPanelsRoot && document.contains(this.infoPanelsRoot)) {
      return this.infoPanelsRoot;
    } else if (this.infoPanelsRoot && !document.contains(this.infoPanelsRoot)) {
      this.infoPanelsRoot = null;
    }

    this.infoPanelsRoot = resolveInfoPanelRoot();
    if (this.infoPanelsRoot) {
      this.ensureInfoPanelsObserverAttached(this.infoPanelsRoot);
    }
    return this.infoPanelsRoot;
  }

  private ensureInfoPanelsObserverAttached(root: HTMLElement): void {
    if (this.infoPanelsObserver && this.infoPanelsObserverRoot === root) {
      return;
    }

    this.infoPanelsObserver?.disconnect();
    this.infoPanelsObserver = observeInfoPanelsRoot(root, (node: HTMLElement) => {
      const infoPanelSelector = `[data-mod-id="${REGIONS_INFO_PANEL_MOD_ID}"]`;
      // Ignore mutations to the info panel itself
      if (node.matches(infoPanelSelector) || node.querySelector(infoPanelSelector) !== null) {
        return;
      }
      // If there is an active selection, clear the selection to prevent a state where the info panel is not shown but a region is still selected (and highlighted on the map)
      if (this.state.activeSelection !== null) {
        this.clearSelection();
      } else {
        this.infoPanelRenderer.tearDown();
      }
    });
    this.infoPanelsObserverRoot = root;
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
    const nextSelection = { datasetIdentifier: RegionDataset.getIdentifier(payload.dataset), featureId: payload.featureId };
    this.setActiveSelection(nextSelection, { toggleIfSame: true, showInfo: true });
  }

  private onOverviewSelect(selection: RegionSelection) {
    this.setActiveSelection(selection, { toggleIfSame: false, showInfo: true });
  }

  private setActiveSelection(
    nextSelection: RegionSelection,
    options: { toggleIfSame: boolean; showInfo: boolean }
  ) {
    const previousSelection = this.state.activeSelection;

    if (RegionSelection.isEqual(previousSelection, nextSelection)) {
      if (options.toggleIfSame) {
        this.clearSelection();
      }
      return;
    }

    this.state.activeSelection = nextSelection;
    this.mapLayers.updateSelection(previousSelection, this.state.activeSelection);

    if (options.showInfo) {
      this.infoPanelRenderer.showFeatureData();
    }

    this.overviewPanelRenderer.tryUpdatePanel();
  }

  get activeSelection(): RegionSelection | null {
    return this.state.activeSelection;
  }

  // --- State Mutations --- //
  onCityChange(cityCode: string) {
    this.reset();
    this.state.cityCode = cityCode;
    this.startCommutersUpdateLoop();
    this.overviewPanelRenderer.initialize();
    this.tryInjectLayerPanel();
  }

  reset() {
    this.stopCommutersUpdateLoop();
    this.clearSelection();
    this.lastCheckedGameTime = -1;
    this.overviewPanelRenderer.tearDown();
  }

  private clearSelection() {
    const previousSelection = this.state.activeSelection;
    this.state.activeSelection = null;

    this.mapLayers.updateSelection(previousSelection, this.state.activeSelection);
    this.infoPanelRenderer.tearDown();
    this.overviewPanelRenderer.tryUpdatePanel();
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
