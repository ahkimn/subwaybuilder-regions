# Known Issues

[Back to README](README.md)

This document contains a list of currently known issues affecting the SubwayBuilder Regions mod, split into major and minor items.

## Major Bugs

Bugs that break core mod functionality and lead to unexpected mod state / crashes are listed here. These will be addressed in the near future

1. _Unsynced Map Layers_ (partially resolved)
   - Custom map layers are reset when:
     - A default data view (e.g. demand point) is opened
     - Render angle changes (zoom seems to not trigger this)
   - ~~The toggle state shown in the `Map Layers` panel is not synced to this reset~~
   - When the game force-drops layers/sources during these resets, the console can log errors (e.g. removing a source while a layer still references it). These do not appear to crash the mod but indicate unstable layer teardown.
   - ~~Workaround: Reset the toggle to the empty state, then toggle again to reattach the map layer~~
2. _Hot-reload inconsistencies_
   - `onCityLoad()` and `onMapReady()` are not always re-triggered on hot-reload
   - As a result, the mod can be placed into an inconsistent state
   - **Workaround**: fully reload a city to reset the mod state
3. _Region labels can be obscured by game layers_
   - Some non-background map layers render above region labels, making them hard to see and click
   - The game appears to re-order layers during runtime and map layers registered via API do not show up

## Minor Bugs / Issues

Bugs or issues that are cosmetic / inconvenient but do not break the core mod functionality are listed here

1. _Unassigned Regions UI_
   - These should not be clickable in any info panel as no boundary exists
2. _Inaccurate Feature Bounds_
   - Map bounds used for preset regions are inaccurate
   - They should replaced either with a demand-based boundary OR a pre-set polygon provided by API / User
3. _Excessive Console Outputs._
   - Mod currently prints many debug statements to console (to aid development)
   - Console logging should be a toggle in mod settings
   - Full debug should be shown
4. _Brittle DOM Injection_
   - Forced DOM injection of `Map Layers` toggles should be replaced by API calls in the future
   - Class-based DOM query / injection of info panel should be replaced by API call
5. _Multiple Top Left Panels_
   - The info panel should either auto-hide when an existing UI panel (e.g. Demand Details) is opened or have consistent behavior (always on top / always on bottom)
   - If the Info Panel is wider than the existing panel will no longer be aligned to the left-hand side of the screen; instead, it will be centered under/over the Info Panel
6. _Selection Escape_
   - Currently, pressing `Esc` clears the selection, as expected; however, it also opens the Settings Menu if there are no active UI panels from the game itself
