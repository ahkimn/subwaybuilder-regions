import { LAYERS_PANEL_MOD_ID, modIdSelector } from '../../core/constants';

export function observeInfoPanelsRoot(
  root: HTMLElement,
  onMutations: (mutations: MutationRecord[]) => void,
): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    onMutations(mutations);
  });

  observer.observe(root, { childList: true });
  return observer;
}

export function observeMapLayersPanel(onFound: (panel: HTMLElement) => void) {
  const observer = new MutationObserver(() => {
    const panel = document.querySelector(
      modIdSelector(LAYERS_PANEL_MOD_ID),
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
