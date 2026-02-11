import type { ModdingAPI, UIToolbarPanelOptions } from "../../../types/modding-api-v1";

type ToolbarPanelHostOptions = Pick<UIToolbarPanelOptions, "id" | "icon" | "tooltip" | "title" | "width"> & {
  allowPointerPassthrough?: boolean;
  persistOnOutsideClick?: boolean;
  panelContentRootId?: string;
};

type HeaderActionOptions = {
  id: string;
  title?: string;
  iconText?: string;
  onClick: () => void;
};

export class ReactToolbarPanelHost {
  private initialized = false;
  private renderFn: (() => unknown) | null = null;
  private hasContent = false;
  private headerAction: HeaderActionOptions | null = null;
  private headerActionButton: HTMLButtonElement | null = null;
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
      render: () => this.renderFn ? this.renderFn() : null,
    };

    const x = this.api.ui.addToolbarPanel(panelOptions);
    console.log(`[ReactToolbarPanelHost] Added toolbar panel with id ${this.options.id}`, { x });
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
    this.removeHeaderAction();
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
    this.scheduleHeaderActionAttach();
  }

  setHeaderAction(action: HeaderActionOptions): void {
    this.headerAction = action;
    this.scheduleHeaderActionAttach();
  }

  private scheduleHeaderActionAttach(): void {
    if (!this.headerAction && !this.options.allowPointerPassthrough) {
      return;
    }
    requestAnimationFrame(() => {
      if (this.headerAction) {
        this.attachHeaderAction();
      }
      if (this.options.allowPointerPassthrough) {
        this.applyPointerPassthrough();
      }
    });
  }

  private attachHeaderAction(): void {
    if (!this.headerAction) {
      return;
    }

    const panel = this.resolvePanelContainer() ?? this.resolvePanelContainerByTitle();
    if (!panel) {
      return;
    }
    const closeButton = this.findCloseButton(panel);
    if (!closeButton) {
      return;
    }
    const actionsContainer = closeButton.parentElement;
    if (!actionsContainer) {
      return;
    }

    const existing = actionsContainer.querySelector<HTMLButtonElement>(`#${this.headerAction.id}`);
    if (existing) {
      this.headerActionButton = existing;
      existing.onclick = this.headerAction.onClick;
      return;
    }

    const button = document.createElement("button");
    button.id = this.headerAction.id;
    button.type = "button";
    button.title = this.headerAction.title ?? "Refresh";
    button.ariaLabel = this.headerAction.title ?? "Refresh";
    button.className = [
      "inline-flex items-center justify-center",
      "h-7 w-7 rounded-md border border-input",
      "bg-background text-muted-foreground",
      "transition-colors hover:bg-accent hover:text-accent-foreground",
    ].join(" ");
    button.textContent = this.headerAction.iconText ?? "↻";
    button.onclick = this.headerAction.onClick;

    actionsContainer.insertBefore(button, closeButton);
    this.headerActionButton = button;
  }

  private resolvePanelContainerByTitle(): HTMLElement | null {
    const headerHost = this.findPanelHeaderHost();
    if (!headerHost) {
      return null;
    }
    return this.findPanelContainer(headerHost);
  }
  private removeHeaderAction(): void {
    if (this.headerActionButton?.parentElement) {
      this.headerActionButton.remove();
    }
    this.headerActionButton = null;
  }

  private findPanelHeaderHost(): HTMLElement | null {
    if (!this.options.title) return null;

    const titleCandidates = Array.from(document.querySelectorAll<HTMLElement>("*"))
      .filter((el) => {
        const text = el.textContent?.trim();
        if (text !== this.options.title) return false;
        if (el.children.length > 0) return false;
        return true;
      });

    for (const titleEl of titleCandidates) {
      let current: HTMLElement | null = titleEl.parentElement;
      for (let i = 0; i < 8 && current; i += 1) {
        if (this.findCloseButton(current)) {
          return current;
        }
        current = current.parentElement;
      }
    }
    return null;
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

  private findCloseButton(host: HTMLElement): HTMLButtonElement | null {
    const buttons = Array.from(host.querySelectorAll<HTMLButtonElement>("button"));
    return buttons.find((button) => {
      const aria = button.getAttribute("aria-label")?.toLowerCase() ?? "";
      const title = button.getAttribute("title")?.toLowerCase() ?? "";
      const text = button.textContent?.trim() ?? "";
      return aria.includes("close") || title.includes("close") || text === "x" || text === "\u00D7";
    }) ?? null;
  }
  private startDomObserver(): void {
    if (this.domObserver) {
      return;
    }
    this.domObserver = new MutationObserver(() => this.scheduleHeaderActionAttach());
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

