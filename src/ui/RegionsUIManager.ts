import { RegionDataBuilder } from "../core/datasets/RegionDataBuilder";
import { RegionDataset } from "../core/datasets/RegionDataset";
import { RegionsMapLayers } from "../map/RegionsMapLayers";
import { ModdingAPI } from "../types";
import { observeInfoPanelsRoot, observeMapLayersPanel } from "./observers/observers";
import { RegionsInfoPanelRenderer } from "./panels/info/RegionsInfoPanelRenderer";
import { injectRegionToggles } from "./panels/layers/toggles";
import { resolveInfoPanelRoot } from "./resolve/resolve-info-panel";

const REGIONS_INFO_CONTAINER_ID = 'regions-info-container';
const REGIONS_INFO_UPDATE_GAME_INTERVAL = 1800; // 30 in-game minutes
const REGIONS_INFO_UPDATE_REAL_INTERVAL = 10; // 10 real-world seconds

export class RegionsUIManager {
  private mapLayers: RegionsMapLayers;
  private infoPanelRenderer: RegionsInfoPanelRenderer;

  private regionDataBuilder: RegionDataBuilder;

  private api: ModdingAPI;
  private lastCheckedGameTime: number = -1; // negative value indicates unchecked

  private commutersUpdateInterval: number | null = null;

  private initialized: boolean;

  layerPanelRoot: HTMLElement | null = null;
  infoPanelsRoot: HTMLElement | null = null;

  private state = {
    cityCode: null as string | null,
    lastInjectedCity: null as string | null,

    activeDatasetId: null as string | null,
    activeFeatureId: null as string | number | null,

    cityDatasets: [] as RegionDataset[],
  };

  constructor(
    api: ModdingAPI,
    mapLayers: RegionsMapLayers,
  ) {
    this.mapLayers = mapLayers;
    this.infoPanelRenderer = new RegionsInfoPanelRenderer(
      REGIONS_INFO_CONTAINER_ID,
      this.getInfoPanelRoot.bind(this)
    );

    this.regionDataBuilder = new RegionDataBuilder(api);

    this.api = api;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) {
      // Unexpected state. If this happens, it means 
      console.error("[Regions] UI Manager is already initialized");
      return;
    }
    this.initialized = true;
    this.startCommutersUpdateLoop();

    this.mapLayers.setEvents({
      onRegionSelect: this.onRegionSelect.bind(this),
    })

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

  tryInjectLayerPanel() {
    if (!this.layerPanelRoot || !this.state.cityCode || !this.state.cityDatasets.length) return;
    if (this.state.lastInjectedCity === this.state.cityCode) return;

    this.state.lastInjectedCity = this.state.cityCode;

    this.state.cityDatasets.forEach(ds => {
      this.mapLayers!.ensureDatasetRendered(ds);
    });

    const toggleOptions = this.state.cityDatasets.map((ds) => this.mapLayers!.getDatasetToggleOptions(ds));

    injectRegionToggles(this.layerPanelRoot, toggleOptions);
    console.log('[Regions] Layer panel UI injected');
  }

  private onRegionSelect(payload: { dataset: RegionDataset; featureId: string | number }) {
    this.state.activeDatasetId = payload.dataset.getIdentifier();
    this.state.activeFeatureId = payload.featureId;

    this.infoPanelRenderer.showFeatureData(payload.dataset, payload.featureId);
  }

  get activeSelection() {
    return {
      datasetId: this.state.activeDatasetId,
      featureId: this.state.activeFeatureId,
    };
  }

  // TODO: Add setter for entry point into data / chart element

  // --- State Mutations --- //
  onCityChange(cityCode: string, datasets: RegionDataset[] = []) {
    this.reset();
    this.state.cityCode = cityCode;
    this.state.cityDatasets = datasets;
    this.tryInjectLayerPanel();
  }

  reset() {
    this.stopCommutersUpdateLoop();

    this.state.activeDatasetId = null;
    this.state.activeFeatureId = null;

    this.state.cityDatasets = [];
    this.infoPanelRenderer.tearDown();
  }

  // --- Commuter Updates --- //
  private startCommutersUpdateLoop() {
    if (this.commutersUpdateInterval !== null) {
      return;
    }

    this.commutersUpdateInterval = window.setInterval(() => {
      this.tryUpdateCommutersData();
    }, REGIONS_INFO_UPDATE_REAL_INTERVAL * 1000);
  }

  private stopCommutersUpdateLoop() {
    if (this.commutersUpdateInterval !== null) {
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

  private updateCommutersData() {
    if (this.state.activeDatasetId == null || this.state.activeFeatureId == null) {
      return;
    }

    const dataset = this.state.cityDatasets.find(ds => ds.getIdentifier() === this.state.activeDatasetId);
    if (!dataset) {
      console.error(`[Regions] Unable to find active dataset: ${this.state.activeDatasetId}`);
      return;
    }

    const commuterData = this.regionDataBuilder.buildRegionCommuteData(dataset, this.state.activeFeatureId);

    if (commuterData) {
      dataset.updateWithCommuterData(this.state.activeFeatureId, commuterData);

      this.infoPanelRenderer.updateFeatureData(
        this.state.activeDatasetId,
        dataset.getRegionGameData(this.state.activeFeatureId)!
      )
    }
  }
};