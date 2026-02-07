
/* 
Function to resolve the root element for the info panel

In SubwayBuilder, this is positioned in the top left corner of the screen and is used to house informational panels, such as individual demand point data
*/
export function resolveInfoPanelRoot(): HTMLElement | null {
  // TODO (Issue 5): Make this more robust. It should ideally be findable via modding API and/or have stable identifier
  const candidates = Array.from(
    document.querySelectorAll('div.flex.flex-col.gap-1.p-2')
  ) as HTMLElement[];

  for (const el of candidates) {
    const parent = el.parentElement
    if (parent && !parent.classList.contains('right-0')) {
      return el;
    }
  }

  return null;
}
