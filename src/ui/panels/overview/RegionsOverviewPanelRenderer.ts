import {
  REGIONS_OVERVIEW_PANEL_ID,
  REGIONS_OVERVIEW_PANEL_TITLE,
} from '../../../core/constants';
import type { RegionDataManager } from '../../../core/datasets/RegionDataManager';
import type { RegionSelection, UIState } from '../../../core/types';
import type { ModdingAPI } from '../../../types/modding-api-v1';
import { ReactToolbarPanelHost } from '../shared/ReactToolbarPanelHost';
import type { RegionsPanelRenderer } from '../types';
import { renderRegionsOverviewPanel } from './RegionsOverviewPanel';
import type { RegionsOverviewPanelState } from './types';

export type RegionsOverviewPanelEvents = {
  onRegionSelect?: (payload: RegionSelection, toggleIfSame: boolean) => void;
  onRegionDoubleClick?: (payload: RegionSelection) => void;
};

export class RegionsOverviewPanelRenderer implements RegionsPanelRenderer {
  private readonly host: ReactToolbarPanelHost;
  private initialized = false;
  // Store state snapshot for the OverviewPanel to retain state even if the panel is closed by the user
  private panelStateSnapshot: RegionsOverviewPanelState | null = null;
  private activeCityCode: string | null = null;

  private events: RegionsOverviewPanelEvents = {};

  constructor(
    private readonly api: ModdingAPI,
    private readonly state: Readonly<UIState>,
    private readonly dataManager: RegionDataManager,
  ) {
    this.host = new ReactToolbarPanelHost(api, {
      id: REGIONS_OVERVIEW_PANEL_ID,
      icon: 'MapPinned',
      title: REGIONS_OVERVIEW_PANEL_TITLE,
      width: 720,
    });
  }

  setEvents(events: RegionsOverviewPanelEvents) {
    this.events = events;
  }

  initialize(): void {
    if (this.initialized) return;
    if (!this.state.cityCode) return;

    if (this.activeCityCode !== this.state.cityCode) {
      this.panelStateSnapshot = null;
      this.activeCityCode = this.state.cityCode;
    }

    const currentDatasetIds = this.dataManager.getCityDatasetIds(
      this.state.cityCode,
    );
    if (currentDatasetIds.length === 0) {
      console.warn(
        '[Regions] No region datasets available for current city, no overview panel will be shown.',
      );
      return;
    }
    this.host.initialize();
    this.host.setRender(() =>
      renderRegionsOverviewPanel({
        api: this.api,
        uiState: this.state,
        regionDataManager: this.dataManager,
        availableDatasetIdentifiers: currentDatasetIds,
        onRegionSelect: this.events.onRegionSelect ?? (() => {}),
        onRegionDoubleClick: this.events.onRegionDoubleClick ?? (() => {}),
        initialState: this.panelStateSnapshot,
        onStateChange: (nextState) => {
          this.panelStateSnapshot = nextState;
          this.activeCityCode = this.state.cityCode;
        },
      }),
    );
    this.initialized = true;
  }

  tearDown(): void {
    this.initialized = false;
    this.host.clear();
  }

  isVisible(): boolean {
    return this.host.isVisible();
  }

  tryUpdatePanel(): void {
    if (!this.initialized) {
      this.initialize();
      return;
    }
    this.host.requestRender();
  }
}
