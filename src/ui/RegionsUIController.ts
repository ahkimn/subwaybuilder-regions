import { RegionsMapLayers } from "../map/RegionsMapLayers";
import { RegionsInfoPanel } from "./panels/info/RegionsInfoPanel";

export class RegionsUIController {
  private mapLayers: RegionsMapLayers;
  private infoPanel: RegionsInfoPanel;

  private layersPanelRoot: HTMLElement | null = null;
  private infoPanelsRoot: HTMLElement | null = null;

  private state: RegionsUIState = {
    cityCode: null,
    activeDatasetId: null,
    visibleDatasets: new Set(),
    activeSurface: null,
  };

  constructor(
    mapLayers: RegionsMapLayers,
    infoPanel: RegionsInfoPanel
  ) {
    this.mapLayers = mapLayers;
    this.infoPanel = infoPanel;
  }
}