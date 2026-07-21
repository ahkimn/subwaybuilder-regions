/* 
Function to resolve the root element for the info panel

In SubwayBuilder, this is positioned in the top left corner of the screen and is used to house informational panels, such as individual demand point data
*/
export function resolveInfoPanelRoot(): HTMLElement | null {
  // TODO (Issue 5): Make this more robust. It should ideally be findable via modding API and/or have stable identifier
  const candidates = Array.from(
    document.querySelectorAll('div.flex.flex-col.gap-1.p-2'),
  ) as HTMLElement[];

  for (const el of candidates) {
    const parent = el.parentElement;
    if (parent && !parent.classList.contains('right-0')) {
      return el;
    }
  }

  return null;
}

// Identifying classes of the persisted navbar host layer
const NAV_PANEL_HOST_SELECTOR =
  'div.pointer-events-none.z-20.absolute.bottom-0.left-0';

/*
Function to resolve the persistent nav-panel host layer used from game from versions 1.4.0 onward.

In the post-1.4.0 layout the top-left demand view was replaced by a set ofdraggable
`#metro-nav-panel-*` panels (with `data-mod-id="nav-panel"`) that live inside a
full-viewport overlay layer. 
*/
export function resolveNavPanelHost(): HTMLElement | null {
  // Check if the game-native demand view panel exists
  const openNavPanel = document.querySelector('[data-mod-id="nav-panel"]');
  if (openNavPanel?.parentElement) {
    // If so, select its parent
    return openNavPanel.parentElement;
  }

  // Check for the bottom bar by element ID, and attempt to resolve its host-layer ancestor
  const bottomBar = document.getElementById('metro-bottom-bar');
  const hostFromBottomBar = bottomBar?.closest<HTMLElement>(
    NAV_PANEL_HOST_SELECTOR,
  );
  if (hostFromBottomBar) {
    return hostFromBottomBar;
  }

  // Default to attempting to resolve via by the unique class signature of the host layer.
  return document.querySelector<HTMLElement>(NAV_PANEL_HOST_SELECTOR);
}
