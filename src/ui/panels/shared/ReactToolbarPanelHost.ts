import type { ModdingAPI, UIToolbarPanelOptions } from "../../../types/modding-api-v1";

type ToolbarPanelHostOptions = Pick<UIToolbarPanelOptions, "id" | "icon" | "tooltip" | "title" | "width"> & {
  allowPointerPassthrough?: boolean;
  persistOnOutsideClick?: boolean;
  panelContentRootId?: string;
};

export class ReactToolbarPanelHost {
  private initialized = false;
  private renderFn: (() => unknown) | null = null;
  private hasContent = false;
  private domObserver: MutationObserver | null = null;
  private passthroughOverlay: HTMLElement | null = null;
  private passthroughPanel: HTMLElement | null = null;
  private passthroughOverlayPointerEvents = "";
  private passthroughPanelPointerEvents = "";
  private clickCaptureHandler: ((event: MouseEvent) => void) | null = null;

  constructor(
    private readonly api: ModdingAPI,
    private readonly options: ToolbarPanelHostOptions
  ) { }

  initialize(): void {
    if (this.initialized) {
      return;
    }

    const panelOptions: UIToolbarPanelOptions = {
      ...this.options,
      render: () => (this.renderFn ? this.renderFn() : null),
    };

    this.api.ui.addToolbarPanel(panelOptions);
    this.initialized = true;
    this.startClickCaptureGuard();
    this.startDomObserver();
  }

  setRender(renderFn: () => unknown): void {
    this.renderFn = renderFn;
    this.hasContent = true;
    this.requestRender();
  }

  clear(): void {
    this.renderFn = null;
    this.hasContent = false;
    this.restorePointerPassthrough();
    this.stopClickCaptureGuard();
    this.stopDomObserver();
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
    if (this.options.allowPointerPassthrough) {
      requestAnimationFrame(() => this.applyPointerPassthrough());
    }
  }

  private applyPointerPassthrough(): void {
    const contentRoot = this.options.panelContentRootId
      ? document.getElementById(this.options.panelContentRootId)
      : null;
    if (!contentRoot) {
      return;
    }

    const panel = this.findPanelContainerFromContent(contentRoot);
    if (!panel) {
      return;
    }

    const overlay = this.findViewportOverlay(panel);
    if (!overlay) {
      return;
    }

    if (this.passthroughOverlay !== overlay) {
      this.restorePointerPassthrough();
      this.passthroughOverlay = overlay;
      this.passthroughOverlayPointerEvents = overlay.style.pointerEvents;
      overlay.style.pointerEvents = "none";
    }

    if (this.passthroughPanel !== panel) {
      this.passthroughPanel = panel;
      this.passthroughPanelPointerEvents = panel.style.pointerEvents;
      panel.style.pointerEvents = "auto";
    }
  }

  private restorePointerPassthrough(): void {
    if (this.passthroughOverlay) {
      this.passthroughOverlay.style.pointerEvents = this.passthroughOverlayPointerEvents;
    }
    if (this.passthroughPanel) {
      this.passthroughPanel.style.pointerEvents = this.passthroughPanelPointerEvents;
    }
    this.passthroughOverlay = null;
    this.passthroughPanel = null;
    this.passthroughOverlayPointerEvents = "";
    this.passthroughPanelPointerEvents = "";
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

  private findViewportOverlay(panel: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = panel.parentElement;
    for (let i = 0; i < 10 && current; i += 1) {
      const rect = current.getBoundingClientRect();
      const coversViewport =
        rect.width >= window.innerWidth - 2 &&
        rect.height >= window.innerHeight - 2;
      if (coversViewport) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  private startDomObserver(): void {
    if (this.domObserver) {
      return;
    }

    this.domObserver = new MutationObserver(() => {
      if (this.options.allowPointerPassthrough) {
        this.applyPointerPassthrough();
      }
    });
    this.domObserver.observe(document.body, { subtree: true, childList: true, attributes: true });
  }

  private stopDomObserver(): void {
    if (!this.domObserver) {
      return;
    }
    this.domObserver.disconnect();
    this.domObserver = null;
  }

  private startClickCaptureGuard(): void {
    if (!this.options.persistOnOutsideClick || this.clickCaptureHandler) {
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
    const contentRoot = this.options.panelContentRootId
      ? document.getElementById(this.options.panelContentRootId)
      : null;
    if (!contentRoot) {
      return null;
    }
    return this.findPanelContainerFromContent(contentRoot);
  }
}
