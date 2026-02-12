import { ReactNode } from "react";
import type { ModdingAPI, UIFloatingPanelOptions } from "../../../types/modding-api-v1";
import { FLOATING_PANEL_OFFSET_X, FLOATING_PANEL_OFFSET_Y } from "../../../core/constants";

type ToolbarPanelHostOptions = Pick<UIFloatingPanelOptions, "id" | "icon" | "title" | "width" | "defaultPosition">;

export class ReactToolbarPanelHost {
  private initialized = false;

  private renderPanel: (() => ReactNode) | null = null;

  private hasContent = false;
  private clickCaptureHandler: ((event: MouseEvent) => void) | null = null;

  constructor(
    private readonly api: ModdingAPI,
    private readonly options: ToolbarPanelHostOptions,
    private readonly panelContentRootId: string
  ) { }

  initialize(): void {
    if (this.initialized) {
      this.startClickCaptureGuard();
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
    this.startClickCaptureGuard();
  }

  setRender(renderFn: () => ReactNode): void {
    this.renderPanel = renderFn;
    this.hasContent = true;
    this.requestRender();
  }

  clear(): void {
    this.renderPanel = null;
    this.hasContent = false;
    this.stopClickCaptureGuard();
    this.requestRender();
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

  private findPanelContainer(headerHost: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = headerHost;
    let candidate: HTMLElement | null = null;
    for (let i = 0; i < 12 && current; i += 1) {
      const parent = current.parentElement;
      if (parent && parent.classList.contains("fixed") && parent.classList.contains("inset-0")) {
        return current;
      }
      candidate = current;
      current = current.parentElement;
    }
    return candidate;
  }

  private findPanelContainerFromContent(contentRoot: HTMLElement): HTMLElement | null {
    return this.findPanelContainer(contentRoot);
  }

  private startClickCaptureGuard(): void {
    if (this.clickCaptureHandler) {
      return;
    }

    this.clickCaptureHandler = (event: MouseEvent) => {
      if (!this.hasContent) {
        return;
      }

      const panel = this.resolvePanelContainer();
      if (!panel) {
        return;
      }

      const target = event.target as Node | null;
      if (target && panel.contains(target)) {
        return;
      }

      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    document.addEventListener("click", this.clickCaptureHandler, true);
  }

  private stopClickCaptureGuard(): void {
    if (!this.clickCaptureHandler) {
      return;
    }
    document.removeEventListener("click", this.clickCaptureHandler, true);
    this.clickCaptureHandler = null;
  }

  private resolvePanelContainer(): HTMLElement | null {
    const contentRoot = this.panelContentRootId
      ? document.getElementById(this.panelContentRootId)
      : null;
    if (!contentRoot) {
      return null;
    }
    return this.findPanelContainerFromContent(contentRoot);
  }
}
