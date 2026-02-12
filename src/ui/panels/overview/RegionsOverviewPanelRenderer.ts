import { REGIONS_OVERVIEW_PANEL_CONTENT_ID, REGIONS_OVERVIEW_PANEL_ID, REGIONS_OVERVIEW_PANEL_TITLE } from "../../../core/constants";
import { RegionDatasetRegistry } from "../../../core/registry/RegionDatasetRegistry";
import type { RegionSelection } from "../../../core/types";
import type { ModdingAPI } from "../../../types/modding-api-v1";
import { ReactToolbarPanelHost } from "../shared/ReactToolbarPanelHost";
import { RegionsOverviewPanel } from "./RegionsOverviewPanel";

export class RegionsOverviewPanelRenderer {
  private readonly host: ReactToolbarPanelHost;
  private overviewPanel: RegionsOverviewPanel;
  private initialized = false;

  constructor(
    private readonly api: ModdingAPI,
    private readonly registry: RegionDatasetRegistry,
    private readonly getCurrentCityCode: () => string | null,
    private readonly getActiveSelection: () => RegionSelection | null,
    private readonly onSelectRegion: (selection: RegionSelection, source: "overview-click") => void
  ) {
    this.host = new ReactToolbarPanelHost(this.api, {
      id: REGIONS_OVERVIEW_PANEL_ID,
      icon: "Table2",
      title: REGIONS_OVERVIEW_PANEL_TITLE,
      tooltip: "Regions Overview",
      width: 720,
      allowPointerPassthrough: true,
      persistOnOutsideClick: true,
      panelContentRootId: REGIONS_OVERVIEW_PANEL_CONTENT_ID,
    });

    this.overviewPanel = new RegionsOverviewPanel({
      api: this.api,
      getCurrentCityCode: this.getCurrentCityCode,
      getCityDatasets: (cityCode: string) => this.registry.getCityDatasets(cityCode),
      getActiveSelection: this.getActiveSelection,
      onSelectRegion: this.onSelectRegion,
      requestRender: () => this.host.requestRender(),
    });
  }

  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.host.initialize();
    this.host.setRender(() => this.overviewPanel.render());
    this.initialized = true;
  }

  tearDown(): void {
    this.overviewPanel.reset();
    this.host.clear();
  }

  isVisible(): boolean {
    return this.host.isVisible();
  }

  tryUpdatePanel(): void {
    this.host.setRender(() => this.overviewPanel.render());
  }
}
