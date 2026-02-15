import { createElement } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import {
  REGIONS_INFO_CONTAINER_ID,
  REGIONS_INFO_PANEL_MOD_ID,
  REGIONS_INFO_ROOT_PREFIX,
} from '../../../core/constants';
import type { RegionDataManager } from '../../../core/datasets/RegionDataManager';
import type { UIState } from '../../../core/types';
import type { RegionsPanelRenderer } from '../types';
import { RegionsReactInfoPanel } from './RegionsInfoPanel';

export class RegionsInfoPanelRenderer implements RegionsPanelRenderer {
  private root: HTMLElement | null = null;
  private reactRoot: Root | null = null;
  private forceRefreshToken = 0;

  constructor(
    private readonly state: Readonly<UIState>,
    private readonly dataManager: RegionDataManager,
    private readonly getParentContainer: () => HTMLElement | null,
    private readonly onClose: () => void,
  ) { }

  initialize(): void {
    // No-op for parity with other panel renderers.
  }

  private ensureContainer(): HTMLElement | null {
    if (this.root && document.contains(this.root)) {
      return this.root;
    }

    const parentContainer = this.getParentContainer();
    if (!parentContainer) {
      console.warn('[Regions] Unable to resolve info panel root container');
      return null;
    }

    // Guard against duplicate panel container creation on hot-reload.
    this.replaceExistingContainer();

    const container = document.createElement('div');
    container.id = REGIONS_INFO_CONTAINER_ID;
    container.dataset.modId = REGIONS_INFO_PANEL_MOD_ID;
    container.className = 'pointer-events-auto';
    parentContainer.appendChild(container);

    this.root = container;
    return container;
  }

  private renderReactInfoPanel(forceRefresh: boolean): void {
    const container = this.ensureContainer();
    if (!container) return;

    if (!this.reactRoot) {
      this.reactRoot = createRoot(container, {
        // Avoid collision with game .
        identifierPrefix: `${REGIONS_INFO_ROOT_PREFIX}-`,
      });
    }

    if (forceRefresh) {
      this.forceRefreshToken += 1;
    }

    this.reactRoot.render(
      createElement(RegionsReactInfoPanel, {
        regionDataManager: this.dataManager,
        uiState: this.state,
        onClose: this.onClose,
        forceRefreshToken: this.forceRefreshToken,
      }),
    );
  }

  show(): void {
    this.renderReactInfoPanel(false);
  }

  get rootElement(): HTMLElement | null {
    return this.root;
  }

  tearDown(): void {
    this.unmount();
    this.forceRefreshToken = 0;
  }

  // Unmount container from DOM.
  unmount(): void {
    this.reactRoot?.unmount();
    this.reactRoot = null;

    // Guard against duplicate panel container creation on hot-reload.
    this.replaceExistingContainer();

    if (this.root && this.root.parentElement) {
      this.root.replaceChildren();
      this.root.remove();
    }
    this.root = null;
  }

  private replaceExistingContainer(): void {
    const existing = document.getElementById(REGIONS_INFO_CONTAINER_ID);
    if (existing && existing.parentElement) {
      existing.replaceChildren();
      existing.remove();
    }
  }

  isVisible(): boolean {
    return !!this.root && document.contains(this.root);
  }

  tryUpdatePanel(): void {
    if (this.isVisible()) {
      this.renderReactInfoPanel(false);
    }
  }

  showFeatureData(): void {
    this.renderReactInfoPanel(true);
  }
}
