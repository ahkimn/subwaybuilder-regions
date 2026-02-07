import { RegionDataset } from "../../../core/datasets/RegionDataset";
import { RegionGameData } from "../../../core/datasets/types";
import { InfoPanel } from "./InfoPanel";

export class RegionsInfoPanelRenderer {
  private root: HTMLElement | null = null;
  private containerId: string;

  private infoPanelId: string | null = null;
  private infoPanel: InfoPanel | null = null;

  constructor(
    containerId: string,
    private getParentContainer: () => HTMLElement | null
  ) {
    this.containerId = containerId;
  };

  show() {

    const parentContainer = this.getParentContainer();
    if (!parentContainer || !this.infoPanel) {
      console.warn("[Regions] Unable to show info panel");
      return;
    }

    this.unmount();

    const container = document.createElement('div');
    container.id = this.containerId;
    container.className = 'pointer-events-auto';

    container.appendChild(this.infoPanel!.element);
    parentContainer.appendChild(container);

    this.root = container;
  }

  get rootElement(): HTMLElement | null {
    return this.root;
  }

  tearDown() {
    this.unmount();
    this.infoPanelId = null;
    this.infoPanel = null;
  }

  // Unmount container from DOM
  unmount() {
    // Guard against duplicate panel container creation on hot-reload
    const existing = document.getElementById(this.containerId);
    if (existing && existing.parentElement) {
      existing.replaceChildren();
      existing.remove();
    }

    if (this.root && this.root.parentElement) {
      this.root.replaceChildren();
      this.root.remove();
    }
    this.root = null;
  }

  isVisible(): boolean {
    return !!this.root && document.contains(this.root);
  }

  updateFeatureData(
    datasetId: string,
    featureData: RegionGameData
  ) {
    this.infoPanel?.setFeatureData(datasetId, featureData);
  }

  showFeatureData(
    dataset: RegionDataset,
    featureId: string | number
  ) {

    const feature = dataset.boundaryData!.features.find((f => f.properties!.ID! === featureId));
    if (!feature) {
      console.warn(`[Regions] Unable to find feature ${featureId} in dataset ${dataset.id}`);
    }

    const featureData = dataset.getRegionGameData(featureId);
    if (!featureData) {
      console.warn(`[Regions] Unable to find demand data for feature ${featureId} in dataset ${dataset.id}`);
      return;
    }

    if (!this.infoPanel) {
      this.infoPanelId = 'regions-info-panel';
      this.infoPanel = new InfoPanel(
        `Region Info`,
        this.infoPanelId,
        'regions',
        () => this.tearDown())
    }

    this.infoPanel.setFeatureData(dataset.id, featureData!)
    this.show();
  }
}
