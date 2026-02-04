import { RegionDataset } from "../../../core/datasets/RegionDataset";
import { buildTestRegionPanel } from "./info-panel";

export class RegionsInfoPanel {
  private root: HTMLElement | null = null;
  private containerId: string;

  constructor(
    containerId: string,
    private getParentContainer: () => HTMLElement | null
  ) {
    this.containerId = containerId;
  };

  show(content: HTMLElement) {

    const parentContainer = this.getParentContainer();
    if (!parentContainer) {
      console.warn("[Regions] Unable to show info panel: parent container not found");
      return;
    }

    this.clear();

    const container = document.createElement('div');
    container.id = this.containerId;
    container.dataset.modId = 'regions';
    container.className = 'pointer-events-auto';

    container.appendChild(content);
    parentContainer.appendChild(container);

    this.root = container;
  }

  clear() {
    if (this.root && this.root.parentElement) {
      this.root.remove();
    }
    this.root = null;
  }

  isVisible(): boolean {
    return !!this.root && document.contains(this.root);
  }

  showFeatureData(
    dataset: RegionDataset,
    featureId: string | number
  ) {

    console.log(`[Regions] Show info panel for feature ${featureId} in dataset ${dataset.id}`);
    console.log(this.root);
    console.log(this.getParentContainer());

    this.show(
      buildTestRegionPanel({
        name: dataset.displayName,
        population: 100000,
        area: 123.45
      })
    )
  }
}
