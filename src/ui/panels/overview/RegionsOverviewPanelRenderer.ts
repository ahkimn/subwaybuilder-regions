import { RegionDatasetRegistry } from "../../../core/registry/RegionDatasetRegistry";
import type { RegionSelection } from "../../../core/types";
import type { ModdingAPI } from "../../../types/modding-api-v1";
import { ReactToolbarPanelHost } from "../shared/ReactToolbarPanelHost";
import { RegionsOverviewPanel } from "./RegionsOverviewPanel";

const REGIONS_OVERVIEW_PANEL_ID = "regions-overview-toolbar-panel";
const REGIONS_OVERVIEW_PANEL_TITLE = "Regions Overview";
const REGIONS_OVERVIEW_PANEL_ICON = "Table2";

export class RegionsOverviewPanelRenderer {
  private readonly host: ReactToolbarPanelHost;
  private readonly panel: RegionsOverviewPanel;
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
      icon: REGIONS_OVERVIEW_PANEL_ICON,
      title: REGIONS_OVERVIEW_PANEL_TITLE,
      tooltip: "Regions Overview",
      width: 720,
    });

    this.panel = new RegionsOverviewPanel({
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
    this.host.setHeaderAction({
      id: "regions-overview-refresh-action",
      title: "Refresh table",
      iconText: "↻",
      onClick: () => this.host.requestRender(),
    });
    this.host.setRender(() => this.panel.render());
    this.initialized = true;
  }

  tearDown(): void {
    this.panel.reset();
    this.host.clear();
  }

  isVisible(): boolean {
    return this.host.isVisible();
  }

  tryUpdatePanel(): void {
    this.host.setRender(() => this.panel.render());
  }
}
