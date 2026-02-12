import { REGIONS_INFO_CONTAINER_ID } from '../../../core/constants';
import type { RegionDataManager } from '../../../core/datasets/RegionDataManager';
import type { UIState } from '../../../core/types';
import type { RegionsPanelRenderer } from '../types';
import { RegionsInfoPanel } from './RegionsInfoPanel';

export class RegionsInfoPanelRenderer implements RegionsPanelRenderer {
  private root: HTMLElement | null = null;
  private infoPanel: RegionsInfoPanel | null = null;

  constructor(
    private readonly state: Readonly<UIState>,
    private dataManager: RegionDataManager,
    private getParentContainer: () => HTMLElement | null,
    private onClose: () => void,
  ) {}

  initialize(): void {
    // No-op for parity with other panel renderers.
  }

  show() {
    const parentContainer = this.getParentContainer();
    if (!parentContainer || !this.infoPanel) {
      console.warn('[Regions] Unable to show info panel');
      return;
    }

    this.unmount();

    const container = document.createElement('div');
    container.id = REGIONS_INFO_CONTAINER_ID;
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
    this.infoPanel = null;
  }

  // Unmount container from DOM
  unmount() {
    // Guard against duplicate panel container creation on hot-reload
    const existing = document.getElementById(REGIONS_INFO_CONTAINER_ID);
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

  tryUpdatePanel() {
    this.infoPanel?.tryRender();
  }

  showFeatureData() {
    if (!this.infoPanel) {
      this.infoPanel = new RegionsInfoPanel(
        this.dataManager,
        this.state,
        this.onClose,
      );
    }
    this.infoPanel.tryRender(true);
    this.show();
  }
}
