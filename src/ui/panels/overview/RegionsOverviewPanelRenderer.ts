import { REGIONS_OVERVIEW_PANEL_CONTENT_ID, REGIONS_OVERVIEW_PANEL_ID, REGIONS_OVERVIEW_PANEL_TITLE } from "../../../core/constants";
import type { RegionSelection, UIState } from "../../../core/types";
import type { ModdingAPI } from "../../../types/modding-api-v1";
import { ReactToolbarPanelHost } from "../shared/ReactToolbarPanelHost";
import { RegionsPanelRenderer } from "../types";
import { RegionsOverviewPanel } from "./RegionsOverviewPanel";
import { RegionDataManager } from "../../../core/datasets/RegionDataManager";

export type RegionsOverviewPanelEvents = {
  onRegionSelect?: (payload: RegionSelection) => void;
}

export class RegionsOverviewPanelRenderer implements RegionsPanelRenderer {
  private readonly host: ReactToolbarPanelHost;
  private overviewPanel: RegionsOverviewPanel | null = null;

  private events: RegionsOverviewPanelEvents = {};

  constructor(
    private readonly api: ModdingAPI,
    private readonly state: Readonly<UIState>,
    private readonly dataManager: RegionDataManager
  ) {

    this.host = new ReactToolbarPanelHost(api, {
      id: REGIONS_OVERVIEW_PANEL_ID,
      icon: "Table2",
      title: REGIONS_OVERVIEW_PANEL_TITLE,
      width: 720,
    },
      REGIONS_OVERVIEW_PANEL_CONTENT_ID);
  }

  setEvents(events: RegionsOverviewPanelEvents) {
    this.events = events;
  }

  initialize(): void {
    if (this.overviewPanel !== null) return;
    if (!this.state.cityCode) return;

    const currentDatasetIds = this.dataManager.getCityDatasetIds(this.state.cityCode);
    if (currentDatasetIds.length === 0) {
      console.warn("[Regions] No region datasets available for current city, no overview panel will be shown.");
      return;
    }

    this.overviewPanel = new RegionsOverviewPanel(
      this.api,
      this.state,
      this.dataManager,
      currentDatasetIds,
      this.events.onRegionSelect ?? (() => { }),
      () => this.host.requestRender(),
    );

    this.host.initialize();
    this.host.setRender(() => this.overviewPanel?.render());
  }

  tearDown(): void {
    this.overviewPanel?.reset();
    this.overviewPanel = null;
    this.host.clear();
  }

  isVisible(): boolean {
    return this.host.isVisible();
  }

  tryUpdatePanel(): void {
    if (!this.overviewPanel) {
      this.initialize();
      return;
    }
    this.host.setRender(() => this.overviewPanel?.render());
  }
}
