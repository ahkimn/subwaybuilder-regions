import { Checkbox } from "../../elements/Checkbox";
import { LayerToggleOptions } from "../../types/LayerToggleOptions";

const REGIONS_CONTAINER_ATTR = 'data-regions-mod';
const REGIONS_TOGGLE_ATTR = 'data-regions-toggle';

export function createToggleRow(
  options: LayerToggleOptions
): HTMLElement {
  return Checkbox(options, REGIONS_TOGGLE_ATTR);
}

export function injectRegionToggles(panel: HTMLElement, datasetsToggleOptions: LayerToggleOptions[]) {
  // TODO (Issue 4): When modding API for UI components is more mature, refactor to use that instead :/
  console.log("[Regions] Injecting region toggles into layers panel");

  // const contentContainers = panel.lastChild;
  const contentContainer = panel.querySelector(
    'div.space-y-1.text-sm.h-fit.overflow-y-auto'
  ) as HTMLElement | null;

  if (!contentContainer) {
    console.warn("[Regions] Unable to find layers panel content container");
    return;
  }


  // const segmentsContainer = contentContainer.firstChild;
  const segmentsContainer = contentContainer!.querySelector(
    'div.space-y-3'
  ) as HTMLElement | null;

  if (!segmentsContainer) {
    console.warn("[Regions] Unable to find layers panel segment container");
    return;
  }

  let regionSegment = segmentsContainer!.querySelector(
    `div[${REGIONS_CONTAINER_ATTR}]`
  ) as HTMLElement | null;

  if (!regionSegment) {

    regionSegment = document.createElement('div');
    regionSegment.setAttribute(REGIONS_CONTAINER_ATTR, 'true');
    regionSegment.className = 'space-y-1';

    const segmentHeader = document.createElement('h4');
    segmentHeader.className = 'font-medium mb-1.5 text-xs text-muted-foreground';
    segmentHeader.textContent = 'Region Data Layers';

    regionSegment.appendChild(segmentHeader);
  }

  const existingToggles = regionSegment.querySelectorAll(
    `[${REGIONS_TOGGLE_ATTR}]`
  );
  existingToggles.forEach((toggle) => toggle.remove());

  datasetsToggleOptions.forEach((options) => {
    const toggle = createToggleRow(options);
    regionSegment.appendChild(toggle);
  });


  segmentsContainer.appendChild(regionSegment);
  console.log("[Regions] Region toggles injected");
}