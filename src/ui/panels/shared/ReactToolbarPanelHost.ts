import type { ReactNode } from 'react';

import {
  FLOATING_PANEL_OFFSET_X,
  FLOATING_PANEL_OFFSET_Y,
} from '../../../core/constants';
import type {
  ModdingAPI,
  UIFloatingPanelOptions,
} from '../../../types/modding-api-v1';

type ToolbarPanelHostOptions = Pick<
  UIFloatingPanelOptions,
  | 'id'
  | 'icon'
  | 'title'
  | 'width'
  | 'height'
  | 'defaultWidth'
  | 'defaultHeight'
  | 'defaultPosition'
>;

export class ReactToolbarPanelHost {
  private initialized = false;

  private renderPanel: (() => ReactNode) | null = null;

  private hasContent = false;

  constructor(
    private readonly api: ModdingAPI,
    private readonly options: ToolbarPanelHostOptions,
  ) {}

  initialize(): void {
    if (this.initialized) {
      return;
    }

    const panelWidth = this.options.width ?? 720;
    const defaultPosition = this.options.defaultPosition ?? {
      x: Math.max(16, window.innerWidth - panelWidth - FLOATING_PANEL_OFFSET_X),
      y: FLOATING_PANEL_OFFSET_Y,
    };

    const panelOptions: UIFloatingPanelOptions = {
      ...this.options,
      defaultPosition,
      render: () => (this.renderPanel ? this.renderPanel() : null),
    };

    this.api.ui.addFloatingPanel(panelOptions);
    this.initialized = true;
  }

  setRender(renderFn: () => ReactNode): void {
    this.renderPanel = renderFn;
    this.hasContent = true;
    this.requestRender();
  }

  clear(): void {
    this.renderPanel = null;
    this.hasContent = false;
    // Force render to clear existing content in currently registered panel.
    this.requestRender();
    this.initialized = false;
  }

  isVisible(): boolean {
    return this.hasContent;
  }

  requestRender(): void {
    if (!this.initialized) {
      return;
    }
    this.api.ui.forceUpdate();
  }
}
