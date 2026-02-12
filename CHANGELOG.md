# Changelog

[Back to README](README.md)

## v0.2.1 - 2026-02-12

_Game version_ v1.0.2

- Added repo-wide formatting/lint consistency tooling (`eslint.config.js`, Prettier checks, import sorting, etc.) with no gameplay/runtime behavior changes.

## v0.2.0 - 2026-02-12

_Game version_ v1.0.2

### New Features

- Added initial **Aggregate Data View** panel (`Regions Overview`) using the fixed floating panel API provided in the game's v1.0.0 update
- Added initial overview panel UX structure:
  - Tabbed layout (`Overview` + placeholder tabs)
  - `Overview` contains search + sortable table for viewing game data across multiple regions
- Added state sync between overview panel and existing mod UI:
  - `Overview` row selection updates map highlight + region info panel
  - Active selection state is reflected across map/info/overview surfaces

### Other Updates

- Refactored commuter refresh handling into a reusable loop handler class with support for fixed `onDemandChange` game hook
- Refactored DataTable / SelectRow files to support both React and DOM-only implementations
- More robust map/panel lifecycle management during city/map transitions
- Improved map-layer toggle injection/reinjection, standardized `data-mod-id` / `data-mod-role` selectors

### Bugfixes

- Fixed intermittent map rebind errors during map instance replacement on new city load
- Fixed `Region Info` observer teardown behavior to clear active selection + map highlight when non-mod panels are rendered

### New Issues

- Active selection via `Regions Overview` is made even if map layer is not visible

## v0.1.0 - 2026-02-10 (Initial Release)

_Game version_ v1.0.0

### New Features

- Added visualization for preset region boundaries + labels
- Added information panel when a user selects a region within the game
  - Panel contains region summary statistics as well as commuter / infrastructure data
- Added initial dev scripts to fetch/process data for preset cities
