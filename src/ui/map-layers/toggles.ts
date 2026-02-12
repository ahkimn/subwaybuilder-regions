import {
  MOD_ID_ATTR,
  MOD_ROLE_ATTR,
  REGIONS_LAYER_TOGGLE_CONTAINER_MOD_ID,
  REGIONS_LAYER_TOGGLE_MOD_ROLE,
  modIdSelector,
  modRoleSelector
} from "../../core/constants";
import { Checkbox } from "../elements/Checkbox";
import { LayerToggleOptions } from "../types/LayerToggleOptions";

function createToggleRow(
  options: LayerToggleOptions
): HTMLElement {
  return Checkbox(options, MOD_ROLE_ATTR, REGIONS_LAYER_TOGGLE_MOD_ROLE);
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
    modIdSelector(REGIONS_LAYER_TOGGLE_CONTAINER_MOD_ID)
  ) as HTMLElement | null;

  if (!regionSegment) {

    regionSegment = document.createElement('div');
    regionSegment.setAttribute(MOD_ID_ATTR, REGIONS_LAYER_TOGGLE_CONTAINER_MOD_ID);
    regionSegment.className = 'space-y-1';

    const segmentHeader = document.createElement('h4');
    segmentHeader.className = 'font-medium mb-1.5 text-xs text-muted-foreground';
    segmentHeader.textContent = 'Region Data Layers';

    regionSegment.appendChild(segmentHeader);
  }

  const existingToggles = regionSegment.querySelectorAll(
    modRoleSelector(REGIONS_LAYER_TOGGLE_MOD_ROLE)
  );
  existingToggles.forEach((toggle) => toggle.remove());

  datasetsToggleOptions.forEach((options) => {
    const toggle = createToggleRow(options);
    regionSegment.appendChild(toggle);
  });


  segmentsContainer.appendChild(regionSegment);
  console.log("[Regions] Region toggles injected");
}
