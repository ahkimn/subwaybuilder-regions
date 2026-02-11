import type { ModdingAPI, UIToolbarPanelOptions } from "../../../types/modding-api-v1";

type ToolbarPanelHostOptions = {
  id: string;
  icon: string;
  tooltip?: string;
  title?: string;
  width?: number;
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

  constructor(
    private readonly api: ModdingAPI,
    private readonly options: ToolbarPanelHostOptions
  ) { }

  initialize(): void {
    if (this.initialized) {
      return;
    }

    const panelOptions: UIToolbarPanelOptions = {
      id: this.options.id,
      icon: this.options.icon,
      tooltip: this.options.tooltip,
      title: this.options.title,
      width: this.options.width,
      render: () => this.renderFn ? this.renderFn() : null,
    };

    this.api.ui.addToolbarPanel(panelOptions);
    this.initialized = true;
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
    if (!this.headerAction) {
      return;
    }
    requestAnimationFrame(() => this.attachHeaderAction());
  }

  private attachHeaderAction(): void {
    if (!this.headerAction) {
      return;
    }

    const host = this.findPanelHeaderHost();
    if (!host) {
      return;
    }
    const closeButton = this.findCloseButton(host);
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

  private findCloseButton(host: HTMLElement): HTMLButtonElement | null {
    const buttons = Array.from(host.querySelectorAll<HTMLButtonElement>("button"));
    return buttons.find((button) => {
      const aria = button.getAttribute("aria-label")?.toLowerCase() ?? "";
      const title = button.getAttribute("title")?.toLowerCase() ?? "";
      const text = button.textContent?.trim() ?? "";
      return aria.includes("close") || title.includes("close") || text === "×";
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
}
