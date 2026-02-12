import { LAYERS_PANEL_MOD_ID, modIdSelector } from "../../core/constants";

export function observeInfoPanelsRoot(
  root: HTMLElement,
  onNodeAdded: (node: HTMLElement) => void
): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (node instanceof HTMLElement) {
          onNodeAdded(node);
        }
      }
    }
  });

  observer.observe(root, { childList: true });
  return observer;
}

export function observeMapLayersPanel(onFound: (panel: HTMLElement) => void) {
  const observer = new MutationObserver(() => {
    const panel = document.querySelector(
      modIdSelector(LAYERS_PANEL_MOD_ID)
    ) as HTMLElement | null;

    if (panel) {
      onFound(panel);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}
