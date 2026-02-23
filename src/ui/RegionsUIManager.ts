import {
  LAYERS_PANEL_MOD_ID,
  modIdSelector,
  modRoleSelector,
  REGIONS_INFO_CONTAINER_ID,
  REGIONS_LAYER_TOGGLE_CONTAINER_MOD_ID,
  REGIONS_LAYER_TOGGLE_MOD_ROLE,
} from '../core/constants';
import { RegionDataBuilder } from '../core/datasets/RegionDataBuilder';
import { RegionDataManager } from '../core/datasets/RegionDataManager';
import { RegionDataset } from '../core/datasets/RegionDataset';
import type { RegionDatasetRegistry } from '../core/registry/RegionDatasetRegistry';
import type { RegionsStorage } from '../core/storage/RegionsStorage';
import {
  RegionsSettings,
  type RegionsSettings as RegionsSettingsValue,
} from '../core/storage/types';
import { RegionSelection, UIState, type UIStyle } from '../core/types';
import type { RegionsMapLayers } from '../map/RegionsMapLayers';
import type { ModdingAPI } from '../types/api';
import { CommuterRefreshLoop } from './CommuterRefreshLoop';
import { injectRegionToggles } from './map-layers/toggles';
import {
  observeInfoPanelsRoot as observeInfoPanelRoot,
  observeMapLayersPanel,
} from './observers/observers';
import { RegionsInfoPanelRenderer } from './panels/info/RegionsInfoPanelRenderer';
import { RegionsOverviewPanelRenderer } from './panels/overview/RegionsOverviewPanelRenderer';
import { RegionsSettingsPanelRenderer } from './panels/settings/RegionsSettingsPanelRenderer';
import type { RegionsPanelRenderer } from './panels/types';
import { resolveInfoPanelRoot } from './resolve/resolve-info-panel';

export class RegionsUIManager {
  private mapLayers: RegionsMapLayers | null = null;

  private infoPanelRenderer: RegionsInfoPanelRenderer;
  private overviewPanelRenderer: RegionsOverviewPanelRenderer;
  private settingsPanelRenderer: RegionsSettingsPanelRenderer;
  private renderers: RegionsPanelRenderer[] = [];

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
    private readonly api: ModdingAPI,
    private datasetRegistry: RegionDatasetRegistry,
    storage: RegionsStorage,
    initialSettings?: RegionsSettingsValue,
  ) {
    this.state = new UIState();
    if (initialSettings) {
      this.state.settings = { ...initialSettings };
    }

    const regionDataBuilder = new RegionDataBuilder(this.api);
    this.regionDataManager = new RegionDataManager(
      regionDataBuilder,
      this.datasetRegistry,
      this.api,
    );

    this.infoPanelRenderer = new RegionsInfoPanelRenderer(
      this.state,
      this.regionDataManager,
      this.getInfoPanelRoot.bind(this),
      () => this.clearSelection(),
    );

    this.overviewPanelRenderer = new RegionsOverviewPanelRenderer(
      this.api,
      this.state,
      this.regionDataManager,
    );
    this.settingsPanelRenderer = new RegionsSettingsPanelRenderer(
      this.api,
      storage,
      this.datasetRegistry,
    );
    this.renderers = [
      this.infoPanelRenderer,
      this.overviewPanelRenderer,
      this.settingsPanelRenderer,
    ];

    this.commuterRefreshLoop = new CommuterRefreshLoop(
      this.api,
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

    this.overviewPanelRenderer.setEvents({
      onRegionSelect: (selection: RegionSelection, toggleIfSame: boolean) =>
        this.onOverviewSelect(selection, toggleIfSame),
      onRegionDoubleClick: (selection: RegionSelection) =>
        this.onOverviewSelect(selection, false, true),
    });
    this.infoPanelRenderer.initialize();

    this.settingsPanelRenderer.initialize();
    this.settingsPanelRenderer.tryUpdatePanel();

    this.syncResolvedTheme();
    this.ensureLayerPanelObserver();
  }

  attachMapLayers(mapLayers: RegionsMapLayers): void {
    this.mapLayers = mapLayers;
    this.mapLayers.setEvents({
      onRegionSelect: this.onRegionSelect.bind(this),
      onLayerStateSync: () => this.tryInjectLayerPanel(true),
      onLayerVisibilityChange: ({ datasetIdentifier, visible }) =>
        this.onLayerVisibilityChange(datasetIdentifier, visible),
    });
    this.mapLayers.setSelectionProvider(
      (): RegionSelection | null => this.state.activeSelection,
    );
    this.mapLayers.setSettings(this.state.settings);
    this.mapLayers.setLightMode(this.state.style.lightMode);

    this.tryInjectLayerPanel(true);
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
    this.infoPanelObserver = observeInfoPanelRoot(root, (mutations) => {
      // Check if the info panel container was removed in this mutation
      const containerRemoved = mutations.some((mutation) =>
        Array.from(mutation.removedNodes).some(
          (node) =>
            node instanceof HTMLElement &&
            (node.id === REGIONS_INFO_CONTAINER_ID ||
              node.querySelector(`#${REGIONS_INFO_CONTAINER_ID}`) !== null),
        ),
      );

      if (!containerRemoved) return;

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
    if (!this.layerPanelRoot || !this.state.cityCode || !this.mapLayers) {
      return;
    }
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

    // Map layers reset on theme change. For now we can use this as our "hook" to propagate theme updates to the rest of the game's UI
    this.syncResolvedTheme();
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

  private onOverviewSelect(
    selection: RegionSelection,
    toggleIfSame: boolean,
    focusRegion: boolean = false,
  ) {
    const dataset = this.datasetRegistry.getDatasetByIdentifier(
      selection.datasetIdentifier,
    );
    this.mapLayers?.toggleOrSetVisibility(dataset, true);
    this.setActiveSelection(selection, {
      toggleIfSame: toggleIfSame,
      showInfo: true,
    });
    if (focusRegion && this.mapLayers) {
      this.mapLayers.focusRegion(dataset, selection.featureId);
    }
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
    this.mapLayers?.updateSelection(
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

  public setStyle(style: UIStyle): void {
    if (this.state.style.lightMode === style.lightMode) {
      return;
    }

    this.state.style = { ...this.state.style, lightMode: style.lightMode };
    this.mapLayers?.setLightMode(style.lightMode);
    this.refreshVisiblePanels();
  }

  public updateStyle(patch: Partial<UIStyle>): void {
    if (patch.lightMode === undefined) {
      return;
    }
    this.setStyle({ ...this.state.style, lightMode: patch.lightMode });
  }

  public applySettings(settings: RegionsSettingsValue): void {
    if (RegionsSettings.equals(this.state.settings, settings)) {
      return;
    }

    this.state.settings = { ...settings };
    this.mapLayers?.setSettings(this.state.settings);
    this.tryInjectLayerPanel(true);
    this.refreshVisiblePanels();
  }

  // --- State Mutations --- //
  onCityChange(cityCode: string) {
    this.reset();
    this.state.cityCode = cityCode;
    this.commuterRefreshLoop.start();
    this.infoPanelRenderer.initialize();
    this.overviewPanelRenderer.initialize();

    this.mapLayers?.setSettings(this.state.settings);
    this.syncResolvedTheme();
    this.tryInjectLayerPanel();
    this.ensureLayerPanelObserver();
  }

  reset() {
    this.commuterRefreshLoop.stop();
    this.disconnectObservers();
    this.clearSelection();
    this.infoPanelRenderer.tearDown();
    this.overviewPanelRenderer.tearDown();
    this.state.cityCode = null;
    this.state.lastInjectedCity = null;
  }

  onGameEnd(): void {
    this.reset();
    // We want to enable the overivew panel to be re-rendered on the next city load,
    this.overviewPanelRenderer.markHostDetached();
    this.mapLayers = null;
    this.layerPanelRoot = null;
    this.infoPanelRoot = null;
    this.settingsPanelRenderer.reattachMainMenuEntry();
  }

  tearDown(): void {
    this.reset();
    this.layerPanelRoot = null;
    this.infoPanelRoot = null;
    this.mapLayers = null;
    this.initialized = false;
    this.settingsPanelRenderer.tearDown();
  }

  private clearSelection() {
    const previousSelection = this.state.activeSelection;
    this.state.activeSelection = null;

    this.mapLayers?.updateSelection(
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

  private syncResolvedTheme(): void {
    const resolvedTheme = this.api.ui.getResolvedTheme();
    this.setStyle({ ...this.state.style, lightMode: resolvedTheme });
  }

  private refreshVisiblePanels(): void {
    for (const renderer of this.renderers) {
      if (renderer.isVisible()) {
        renderer.tryUpdatePanel();
      }
    }
  }
}
