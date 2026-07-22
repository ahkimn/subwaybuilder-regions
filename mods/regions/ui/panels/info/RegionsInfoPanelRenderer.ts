import { type DraggableHandle, makeDraggable } from '@lib/ui/draggable';
import type { RegionsPanelRenderer } from '@lib/ui/panels/types';
import {
  INFO_PANEL_DEFAULT_POSITION,
  REGIONS_INFO_CONTAINER_ID,
  REGIONS_INFO_DRAG_HANDLE_ATTR,
  REGIONS_INFO_PANEL_MOD_ID,
  REGIONS_INFO_ROOT_PREFIX,
} from '@regions/core/constants';
import type { RegionDataManager } from '@regions/core/datasets/RegionDataManager';
import type { RegionSelection, UIState } from '@regions/core/domain';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { RegionsInfoPanel } from './RegionsInfoPanel';

const DRAG_HANDLE_SELECTOR = `[${REGIONS_INFO_DRAG_HANDLE_ATTR}]`;
// Sit just above the native nav panels (which use z-index 1/2) within the host.
const DYNAMIC_PANEL_Z_INDEX = '3';

export class RegionsInfoPanelRenderer implements RegionsPanelRenderer {
  private root: HTMLElement | null = null;
  private reactRoot: Root | null = null;
  private forceRefreshToken = 0;
  private initialized = false;

  // Dynamic (draggable) panel state used when `dynamic` is true.
  // Position persists across close/reopen within a city; it is reset to the
  // default on city change. The drag interaction itself is owned by the shared
  // `makeDraggable` helper; we keep `position` here so it survives container
  // recreation (the drag handle is destroyed with the container).
  private position: { x: number; y: number } = {
    ...INFO_PANEL_DEFAULT_POSITION,
  };
  private dragHandle: DraggableHandle | null = null;

  constructor(
    private readonly state: Readonly<UIState>,
    private readonly dataManager: RegionDataManager,
    private readonly getParentContainer: () => HTMLElement | null,
    private readonly onClose: () => void,
    private readonly dynamic: boolean = false,
    private readonly onRegionSelect: (selection: RegionSelection) => void = () =>
      {},
  ) {}

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
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
    this.removeContainer();

    const container = document.createElement('div');
    container.id = REGIONS_INFO_CONTAINER_ID;
    container.dataset.modId = REGIONS_INFO_PANEL_MOD_ID;
    container.className = 'pointer-events-auto';

    if (this.dynamic) {
      // Float within the nav-panel host layer, positioned via an inline
      // transform like the native 1.4.0+ panels, dragged by its header.
      container.style.position = 'absolute';
      container.style.left = '0';
      container.style.top = '0';
      container.style.zIndex = DYNAMIC_PANEL_Z_INDEX;
      this.dragHandle = makeDraggable(container, {
        handleSelector: DRAG_HANDLE_SELECTOR,
        initialPosition: this.position,
        onChange: (position) => {
          this.position = position;
        },
      });
    }

    parentContainer.appendChild(container);

    this.root = container;
    return container;
  }

  private renderInfoPanel(forceRefresh: boolean): void {
    const container = this.ensureContainer();
    if (!container) return;

    // There is currently no explicit API for adding a panel to the top-left container in SubwayBuilder; therefore, we inject a separate mod-owned React root
    if (!this.reactRoot) {
      this.reactRoot = createRoot(container, {
        // Avoid collision with game virtual React DOM root
        identifierPrefix: `${REGIONS_INFO_ROOT_PREFIX}-`,
      });
    }

    if (forceRefresh) {
      this.forceRefreshToken += 1;
    }

    this.reactRoot.render(
      createElement(RegionsInfoPanel, {
        regionDataManager: this.dataManager,
        uiState: this.state,
        onClose: this.onClose,
        forceRefreshToken: this.forceRefreshToken,
        draggable: this.dynamic,
        onRegionSelect: this.onRegionSelect,
      }),
    );
  }

  tearDown(): void {
    this.initialized = false;
    this.unmount();
    this.forceRefreshToken = 0;
  }

  unmount(): void {
    this.reactRoot?.unmount();
    this.reactRoot = null;
    this.removeContainer();
  }

  /**
   * Resets the dynamic panel to its default position. Called on city change so
   * a new city starts at the default spot; a dragged position otherwise
   * persists across close/reopen within the same city.
   */
  resetPosition(): void {
    this.position = { ...INFO_PANEL_DEFAULT_POSITION };
    this.dragHandle?.setPosition(this.position);
  }

  private removeContainer(): void {
    this.dragHandle?.destroy();
    this.dragHandle = null;

    if (this.root && this.root.parentElement) {
      this.root.replaceChildren();
      this.root.remove();
    }

    const existing = document.getElementById(REGIONS_INFO_CONTAINER_ID);
    if (existing && existing.parentElement) {
      existing.replaceChildren();
      existing.remove();
    }

    this.root = null;
  }

  isVisible(): boolean {
    return !!this.root && document.contains(this.root);
  }

  tryUpdatePanel(): void {
    if (!this.initialized) {
      this.initialize();
      return;
    }
    if (this.isVisible()) {
      this.renderInfoPanel(false);
    }
  }

  // Invoked when the user selects a region on the map or via the Overview panel
  showFeatureData(): void {
    if (!this.initialized) {
      this.initialize();
    }
    this.renderInfoPanel(true);
  }
}
