import type { RegionDatasetRegistry } from 'src/core/registry/static';

import {
  LAYERS_PANEL_MOD_ID,
  modIdSelector,
  modRoleSelector,
  REGIONS_INFO_CONTAINER_ID,
  REGIONS_INFO_PANEL_MOD_ID,
  REGIONS_LAYER_TOGGLE_CONTAINER_MOD_ID,
  REGIONS_LAYER_TOGGLE_MOD_ROLE,
} from '../core/constants';
import { RegionDataBuilder } from '../core/datasets/RegionDataBuilder';
import { RegionDataManager } from '../core/datasets/RegionDataManager';
import { RegionDataset } from '../core/datasets/RegionDataset';
import { RegionSelection, UIState } from '../core/types';
import type { RegionsMapLayers } from '../map/RegionsMapLayers';
import type { ModdingAPI } from '../types/modding-api-v1';
import { CommuterRefreshLoop } from './CommuterRefreshLoop';
import { injectRegionToggles } from './map-layers/toggles';
import {
  observeInfoPanelsRoot as observeInfoPanelRoot,
  observeMapLayersPanel,
} from './observers/observers';
import { RegionsInfoPanelRenderer } from './panels/info/RegionsInfoPanelRenderer';
import { RegionsOverviewPanelRenderer } from './panels/overview/RegionsOverviewPanelRenderer';
import { resolveInfoPanelRoot } from './resolve/resolve-info-panel';

export class RegionsUIManager {
  private infoPanelRenderer: RegionsInfoPanelRenderer;
  private overviewPanelRenderer: RegionsOverviewPanelRenderer;

  private regionDataManager: RegionDataManager;
  private commuterRefreshLoop: CommuterRefreshLoop;

  private initialized: boolean;

  layerPanelRoot: HTMLElement | null = null;
  infoPanelRoot: HTMLElement | null = null;

  private mapLayersPanelObserver: MutationObserver | null = null;

  private infoPanelObserver: MutationObserver | null = null;
  private infoPanelObserverRoot: HTMLElement | null = null;

  private state: UIState;

  constructor(
    api: ModdingAPI,
    private mapLayers: RegionsMapLayers,
    private datasetRegistry: RegionDatasetRegistry,
  ) {
    this.state = new UIState();

    const regionDataBuilder = new RegionDataBuilder(api);
    this.regionDataManager = new RegionDataManager(
      regionDataBuilder,
      this.datasetRegistry,
      api,
    );

    this.infoPanelRenderer = new RegionsInfoPanelRenderer(
      this.state,
      this.regionDataManager,
      this.getInfoPanelRoot.bind(this),
      () => this.clearSelection(),
    );

    this.overviewPanelRenderer = new RegionsOverviewPanelRenderer(
      api,
      this.state,
      this.regionDataManager,
    );

    this.commuterRefreshLoop = new CommuterRefreshLoop(
      api,
      this.state,
      this.regionDataManager,
      [this.infoPanelRenderer, this.overviewPanelRenderer],
    );

    this.initialized = false;
  }

  initialize() {
    if (this.initialized) {
      console.error('[Regions] UI Manager is already initialized');
      return;
    }
    this.initialized = true;

    this.mapLayers.setEvents({
      onRegionSelect: this.onRegionSelect.bind(this),
      onLayerStateSync: () => this.tryInjectLayerPanel(true),
      onLayerVisibilityChange: ({ datasetIdentifier, visible }) =>
        this.onLayerVisibilityChange(datasetIdentifier, visible),
    });

    this.overviewPanelRenderer.setEvents({
      onRegionSelect: (selection: RegionSelection) =>
        this.onOverviewSelect(selection),
    });

    this.mapLayers.setSelectionProvider(
      (): RegionSelection | null => this.state.activeSelection,
    );

    this.infoPanelRenderer.initialize();
    this.ensureLayerPanelObserver();
  }

  // --- Observers Management --- //

  getInfoPanelRoot(): HTMLElement | null {
    if (this.infoPanelRoot) {
      if (document.contains(this.infoPanelRoot)) {
        this.ensureInfoPanelObserver(this.infoPanelRoot);
        return this.infoPanelRoot;
      } else {
        this.infoPanelRoot = null;
      }
    }

    this.infoPanelRoot = resolveInfoPanelRoot();
    this.infoPanelRoot && this.ensureInfoPanelObserver(this.infoPanelRoot);
    return this.infoPanelRoot;
  }

  private ensureInfoPanelObserver(root: HTMLElement): void {
    if (this.infoPanelObserver && this.infoPanelObserverRoot === root) return;

    this.infoPanelObserver?.disconnect();
    this.infoPanelObserver = observeInfoPanelRoot(root, (node: HTMLElement) => {
      if (
        node.id === REGIONS_INFO_CONTAINER_ID ||
        node.querySelector(`#${REGIONS_INFO_CONTAINER_ID}`) !== null
      ) {
        return;
      }

      const infoPanelSelector = modIdSelector(REGIONS_INFO_PANEL_MOD_ID);
      // Ignore mutations to the info panel itself
      if (
        node.matches(infoPanelSelector) ||
        node.querySelector(infoPanelSelector) !== null
      ) {
        return;
      }
      // If there is an active selection, clear the selection to prevent a state where the info panel is not shown but a region is still selected (and highlighted on the map)
      if (this.state.activeSelection !== null) {
        this.clearSelection();
      } else {
        this.infoPanelRenderer.tearDown();
      }
    });
    this.infoPanelObserverRoot = root;
  }

  private ensureLayerPanelObserver(): void {
    if (this.mapLayersPanelObserver) return;

    this.mapLayersPanelObserver = observeMapLayersPanel((panel) => {
      const rootChanged = this.layerPanelRoot !== panel;
      this.layerPanelRoot = panel;
      this.tryInjectLayerPanel(rootChanged);
    });

    const existingPanel = document.querySelector(
      modIdSelector(LAYERS_PANEL_MOD_ID),
    ) as HTMLElement | null;
    if (existingPanel) {
      this.layerPanelRoot = existingPanel;
      this.tryInjectLayerPanel(true);
    }
  }

  private disconnectObservers(): void {
    this.infoPanelObserver?.disconnect();
    this.mapLayersPanelObserver?.disconnect();

    this.infoPanelObserver = null;
    this.mapLayersPanelObserver = null;
  }

  tryInjectLayerPanel(force: boolean = false) {
    if (!this.layerPanelRoot || !this.state.cityCode) return;
    if (!document.contains(this.layerPanelRoot)) {
      this.layerPanelRoot = null;
      return;
    }

    const hasRegionToggles = this.hasInjectedRegionToggles(this.layerPanelRoot);
    const shouldInject =
      force ||
      this.state.lastInjectedCity !== this.state.cityCode ||
      !hasRegionToggles;

    if (!shouldInject) return;

    if (this.state.lastInjectedCity !== this.state.cityCode) {
      this.state.lastInjectedCity = this.state.cityCode;
    }

    const cityDatasets = this.datasetRegistry.getCityDatasets(
      this.state.cityCode,
    );
    cityDatasets.forEach((ds) => {
      this.mapLayers!.ensureDatasetLayers(ds);
    });
    const toggleOptions = cityDatasets.map((ds) =>
      this.mapLayers!.getDatasetToggleOptions(ds),
    );

    injectRegionToggles(this.layerPanelRoot, toggleOptions);
    console.log('[Regions] Layer panel UI injected');
  }

  private hasInjectedRegionToggles(panel: HTMLElement): boolean {
    const regionSegment = panel.querySelector(
      modIdSelector(REGIONS_LAYER_TOGGLE_CONTAINER_MOD_ID),
    );
    if (!regionSegment) return false;
    return (
      regionSegment.querySelector(
        modRoleSelector(REGIONS_LAYER_TOGGLE_MOD_ROLE),
      ) !== null
    );
  }

  private onRegionSelect(payload: {
    dataset: RegionDataset;
    featureId: string | number;
  }) {
    const nextSelection = {
      datasetIdentifier: RegionDataset.getIdentifier(payload.dataset),
      featureId: payload.featureId,
    };
    this.setActiveSelection(nextSelection, {
      toggleIfSame: true,
      showInfo: true,
    });
  }

  private onOverviewSelect(selection: RegionSelection) {
    const dataset = this.datasetRegistry.getDatasetByIdentifier(
      selection.datasetIdentifier,
    );
    this.mapLayers.toggleOrSetVisibility(dataset, true);
    this.setActiveSelection(selection, { toggleIfSame: true, showInfo: true });
  }

  private onLayerVisibilityChange(
    datasetIdentifier: string,
    visible: boolean,
  ): void {
    if (
      !visible &&
      this.state.activeSelection?.datasetIdentifier === datasetIdentifier
    ) {
      this.clearSelection();
    }
    this.tryInjectLayerPanel(true);
  }

  private setActiveSelection(
    nextSelection: RegionSelection,
    options: { toggleIfSame: boolean; showInfo: boolean },
  ) {
    const previousSelection = this.state.activeSelection;

    if (RegionSelection.isEqual(previousSelection, nextSelection)) {
      if (options.toggleIfSame) {
        this.clearSelection();
      }
      return;
    }

    this.state.activeSelection = nextSelection;
    this.mapLayers.updateSelection(
      previousSelection,
      this.state.activeSelection,
    );

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
    this.commuterRefreshLoop.start();
    this.infoPanelRenderer.initialize();
    this.overviewPanelRenderer.initialize();

    this.tryInjectLayerPanel();
    this.ensureLayerPanelObserver();
  }

  reset() {
    this.commuterRefreshLoop.stop();
    this.disconnectObservers();
    this.clearSelection();
    this.overviewPanelRenderer.tearDown();
  }

  tearDown(): void {
    this.reset();
    this.layerPanelRoot = null;
    this.infoPanelRoot = null;
    this.state.cityCode = null;
    this.state.lastInjectedCity = null;
    this.initialized = false;
  }

  private clearSelection() {
    const previousSelection = this.state.activeSelection;
    this.state.activeSelection = null;

    this.mapLayers.updateSelection(
      previousSelection,
      this.state.activeSelection,
    );
    this.infoPanelRenderer.tearDown();
    this.overviewPanelRenderer.tryUpdatePanel();
  }

  public handleDeselect() {
    if (this.state.isActive) {
      this.clearSelection();
    }
  }
}
