# Known Issues

[Back to README](README.md)

This document contains a list of currently known issues affecting the SubwayBuilder Regions mod, split into major and minor items.

## Status Snapshot

- `🔴 Open`: Known issue with no current fix, clear mod/game degradation
- `🟡 Partially Resolved`: Some fixes exist, limited mod/game degradation

## Major Bugs

Bugs that break core mod functionality and lead to unexpected mod state / crashes are listed here. These will be addressed in the near future.

1. _Unsynced Map Layers_ (`🟡 Partially Resolved`)
   - Custom map layers are reset when:
     - A default data view (e.g. demand point) is opened
     - Render angle changes (zoom seems to not trigger this)
   - ~~The toggle state shown in the `Map Layers` panel is not synced to this reset~~
   - When the game force-drops layers/sources during these resets, the console can log errors (e.g. removing a source while a layer still references it). These do not appear to crash the mod but indicate unstable layer teardown.
   - ~~Workaround: Reset the toggle to the empty state, then toggle again to reattach the map layer~~
2. _Hot-reload inconsistencies_ (`🔴 Open`)
   - `onCityLoad()` and `onMapReady()` are not always re-triggered on hot-reload
   - As a result, the mod can be placed into an inconsistent state
   - **Workaround**: fully reload a city to reset the mod state
3. _Region labels can be obscured by game layers_ (`🔴 Open`)
   - Some non-background map layers render above region labels, making them hard to see and click
   - The game appears to re-order layers during runtime and map layers registered via API do not show up

## Minor Bugs / Issues

Bugs or issues that are cosmetic / inconvenient but do not break the core mod functionality are listed here.

1. _Unassigned Regions UI_ (`🔴 Open`)
   - These should not be clickable in any info panel as no boundary exists
2. _Inaccurate Feature Bounds_ (`🔴 Open`)
   - Map bounds used for preset regions are inaccurate
   - They should replaced either with a demand-based boundary OR a pre-set polygon provided by API / User
3. _Excessive Console Outputs._ (`🔴 Open`)
   - Mod currently prints many debug statements to console (to aid development)
   - Console logging should be a toggle in mod settings
   - Full debug should be shown
4. _Brittle DOM Injection_ (`🔴 Open`)
   - Forced DOM injection of `Map Layers` toggles should be replaced by API calls in the future
   - Class-based DOM query / injection of info panel should be replaced by API call
5. _Selection Escape_ (`🔴 Open`)
   - Currently, pressing `Esc` clears the selection, as expected; however, it also opens the Settings Menu if there are no active UI panels from the game itself
6. _Over-broad Commuter Refresh Scope_ (`🔴 Open`)
   - The commuter refresh loop currently updates based on panel visibility, not active panel tab/view
   - This can trigger unnecessary commuter data refresh work (especially detail refresh) when a visible panel is not on a commuter-focused view
   - Future improvement: move to tab/view-scoped refresh ownership (or panel-local refresh triggers) to reduce redundant work
7. _Slow Infrastructure Data Computation_ (`🔴 Open`)
   - Infrastructure data is currently calculated on a dataset-wide level using a grid index
   - This is relatively efficient when region boundaries are uniform but does not offer significant performance savings when a small number of regions dominate the playable area
     - Additional pre-compute steps (e.g. if a region fully covers a grid cell / differing grid sizes based on region density) can be applied to reduce this latency
8. _Overview Horizontal Scroll_ (`🔴 Open`)
   - Floating panel has a set minimum size of 300 px x 200 px; however, this is far too small for the overview table
     - When the relevant API becomes available, prevent the panel from obscuring the data table / selector buttons
   - The first row of the overview table is not static, making referencing the region name while panning across the table difficult.
9. _Infrastructure Refresh Coverage_ (`🔴 Open`)
   - Infrastructure data now supports dataset-level build for Overview, but refresh is still request-driven (panel open / ensure calls) and not event-loop driven.
   - Infra values can therefore become stale until the user re-enters the Overview tab.
10. _Multiple Simultaneous Data Requests_ (`🔴 Open`)
    - On overview panel load of a dataset, all commuter summary / infra data is requested at a dataset level.
      - Requests may not complete by the time the user navigates to a different tab; if they reopen the same tab again before the request completion, a duplicate request can be spawned
