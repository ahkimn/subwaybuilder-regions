import { RegionDataset } from "../core/datasets/RegionDataset";
import { RegionsMapLayers } from "../map/RegionsMapLayers";
import { observeInfoPanelsRoot, observeMapLayersPanel } from "./observers/observers";
import { RegionsInfoPanelRenderer } from "./panels/info/RegionsInfoPanelRenderer";
import { injectRegionToggles } from "./panels/layers/toggles";
import { resolveInfoPanelRoot } from "./resolve/resolve-info-panel";


export type UISurface = 'info' | 'data';

const REGIONS_INFO_CONTAINER_ID = 'regions-info-container';

export class RegionsUIManager {
  private mapLayers: RegionsMapLayers;
  private infoPanelRenderer: RegionsInfoPanelRenderer;

  private initialized: boolean;

  layerPanelRoot: HTMLElement | null = null;
  infoPanelsRoot: HTMLElement | null = null;

  private state = {
    cityCode: null as string | null,
    lastInjectedCity: null as string | null,

    activeDatasetId: null as string | null,
    activeFeatureId: null as string | number | null,

    cityDatasets: [] as RegionDataset[],
    activeSurface: null as UISurface | null,
  };

  constructor(
    mapLayers: RegionsMapLayers,
  ) {
    this.mapLayers = mapLayers;
    this.infoPanelRenderer = new RegionsInfoPanelRenderer(
      REGIONS_INFO_CONTAINER_ID,
      this.getInfoPanelRoot.bind(this)
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
    this.state.activeSurface = 'info'

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
    this.state.activeDatasetId = null;
    this.state.activeFeatureId = null;
    this.state.activeSurface = null;

    this.state.cityDatasets = [];
    this.infoPanelRenderer.tearDown();
  }
}