# Changelog

[Back to README](README.md)

## v0.4.1 - 2026-03-01

_Game version_ v1.1.0

- Added support for French regions
  - Displayed in the `Settings Menu` as `FR`
  - Five available region types:
    - Départements, Arrondissemenets, Communes
    - Cantons
    - Établissement public de coopération intercommunale (EPCI)
  - All regions have real population data based on underlying communes
  - Source: FR IGN (GéoPF/INSEE)
- Added support for Australian regions
  - Displayed in the `Settings Menu` as `AU`
  - Six available region types:
    - Statistical Areas Level 2 & 3
    - Commonwealth / State Electoral Divisions
    - Local Government Areas
    - Postal Areas
  - All regions have real population data
  - Source: AU ABS (ASGS 2021)

### Other Updates

- Raised per city dataset soft-cap from five datasets to eight
  - Added additional default layer colors so that the same color is not reused for cities with more than five datasets
  - Updated layer selection in the `Overview Panel` to be by dropdown

### Bugfixes

- Fixed non-deterministic dataset ordering/coloring in map layers for cached (`static`/`dynamic`) datasets by adding country metadata to each registry cache entry
- Fixed overview panel recalculating/sorting overview table rows on every re-render by adding memoization
- Fixed dropdown persisting even when user navigates/interacts with other components

## v0.4.0 - 2026-02-28

_Game version_ v1.1.0

### New Features

- Added in-game dataset fetching via the `Settings Menu`
  - Users can now download `dynamic` boundaries for a select group of countries (CA/US/GB) without locally hosted or pre-downloaded GeoJSONs.
  - Boundary box calculation is done automatically using the game's demand data.
  - Boundary data can be generated for **ANY** city within CA/US/GB.
- Added release-bundled runtime fetch tooling for non-developer users
  - Added cross-platform wrapper scripts (`fetch.ps1` / `fetch.sh`) for running city-level boundary generation from the mod directory
  - Added bundled runtime fetch CLI artifact to release packaging (`tools/fetch-cli.cjs`)
- Added dynamic fetch verification flow in `Settings Menu`
  - New sequential flow: `Copy Command` -> `Open Mods Folder` -> `Validate Datasets`
  - Validation checks expected local outputs, persists them as `dynamic` cache entries, and refreshes runtime availability

### Other Updates

- Datasets now include optional `fileSizeMB` metadata surfaced in the `Settings Menu` and registry table.
- Local registry cache normalization now deduplicates by `cityCode + datasetId` with local precedence `user > dynamic > static`.
  - This will ensure compatibility with future user-generated or user-edited datasets
- Runtime fetch eligibility is now driven by shared dataset metadata (`existsOnlineSource`) to keep scripts and UI behavior aligned.
- `Settings Menu` style updated to be more consistent with in-game UI screens.
- Added broader automated test coverage for settings UI/control flow and script/core utility paths.
  - Test suites are now accessible via `npm test` during development.
- ArcGIS query logging now includes descriptive `featureType` context (e.g. counties/districts/wards) for easier script traceability.

### Bugfixes

- Fixed static dataset search not being triggered when registry is empty
- Reduced extraction log noise by suppressing per-feature missing-population warnings when the population input source is empty.

## v0.3.3 - 2026-02-23

_Game version_ v1.1.0

### Other Updates

- Updated visual styling of boundary layers to be more consistent between dark/light modes and generally more subtle.
- Mod folder resolution made more robust by using the available `scanMods()` API.
  - Regions mod folder no longer needs to be in `metro-maker4/mods/regions` for static dataset discovery to happen

## v0.3.2 - 2026-02-23

_Game version_ v1.1.0

### Other Updates

- Added CA data to list of acceptable static datasets, including data for each of the following boundary type:
  - feds (Federal Electoral Districts)
  - csds (Census Subdivisions)
  - fsas (Forward Sortation Areas)
- Dev scripts now compress GeoJSONs by default (compatible with 0.3.0 changes)
- Added a new dev script to allow easy export of entire city data (all boundary files) to a single compressed archive

### New Issues

- Default search input appears to lock after overview panel host/settings button unmount.

## v0.3.1 - 2026-02-22

_Game version_ v1.1.0

### Bugfixes

- Fixed multiple buttons for the `Overview Panel` appearing on initial city load
- Fixed overzealous panel mutation observer causing Recharts diagrams to not render in the `Info Panel`

## v0.3.0 - 2026-02-22

_Game version_ v1.1.0

### New Features

- Added `Settings Menu`, available from the main menu under a new `Regions` button
  - Exposes global settings, currently limited to `Show unpopulated regions` which determines if regions with no demand points are shown in map layers and mod panels
  - Adds a tabular display of all current datasets, broken down by their `Origin` (`static` or `served`) as well as warnings if a dataset may not be usable by the mod
    - Datasets are displayed as unusable if either the city they apply to is no longer available in the game, or if the mod cannot detect the dataset file
      ![Settings Screen Preview](img/settings_preview.png)
- A snapshot of available datasets are now persisted to game storage via Electron API, so the mod no longer has to traverse the mod directory to find static datasets each time the game is initialized
  - :warning: This snapshot must be manually refreshed within Regions settings menu

### Other Updates

- For static datasets, the mod no longer attempts to read the entire dataset file on mod initialization
- Served and static datasets can now be loaded simultaneously
- Mod now accepts compressed GeoJSON files (namely .gz) for more storage efficiency

### Bugfixes

- City activation should now be idempotent
  - City activation no longer fails when the same city / save is reloaded after exit to menu
  - Hot reload should now properly trigger city activation cascade
- Improved label visibility by applying fixed layer ordering on visiblity toggle (behind in-game demand data)

## v0.2.14 - 2026-02-20

_Game version_ v1.1.0

### Bugfixes

- `Info Panel` will now adapt to viewport and all content should be reachable via scrolling

## v0.2.13 - 2026-02-19

_Game version_ v1.1.0

### Other Updates

- Adding pan-to on region select from overview. Double clicking a region from the `Overview Panel` will automatically move the map to the selected region
- Mod UI now adapts (somewhat) to changes in game theme
- Map layers should be more visible in light mode

### Bugfixes

- `Overview Panel` top row / first column are now "sticky" and will remain visible through scrolling

## v0.2.12 - 2026-02-19

_Game version_ v1.1.0

### New Features

- Added additional dimensions for breaking down commuter data: `Time` and `Length` - `Time` corresponds to the departure time of the populations. This includes both Work->Home and Home->Work trips and is bucketed by default to every hour
  - `Length` corresponds to the commute distance of the population by driving. This is bucketed by default to every 5km

- Added Sankey visualization as an alternative to `Table` form for each new dimension
  - Each `Sankey` visualization has three columns of nodes, with one corresponding to commute/commuter sources (e.g. residents of the selected region), another corresponding to mode share, and a final corresponding to the breakdown unit (e.g. hours of the day)

### Other Updates

- Forced `Table` view to show all mode share columns by default to simplify controls
- Updated `Info Panel` to use `useReducer` for better handling of React state

### New Issues

- `Sankey` display colors are not very compatible with Light mode.

## v0.2.11 - 2026-02-15

_Game version_ v1.0.3

### Other Updates

- Minor updates to logging to facilitate debug on mod load.
- Update dangling import

## v0.2.8 - 2026-02-15

_Game version_ v1.0.3

### Other Updates

- Added a temporary workaround path to get the mod working for non-dev users
  - The mod now tries to build the registry from `data_index.json` via the local data server first.
  - If that fetch fails, it falls back to a static city/dataset mapping defined in `src/core/registry/static.ts` and probes local GeoJSON files from the mod data directory.
- This is intended as an interim bridge until the game API exposes a more complete local file access flow.

## v0.2.7 - 2026-02-15

_Game version_ v1.0.3

### New Features

- Added both commuters and infrastructure data computation for `Regions Overview`.
  - Infrastructure data is calculated on a dataset level instead of per-region infra calls using a new `buildDatasetInfraData` path in `RegionDataBuilder`
  - Commuter data loads independently of infrastructure data
- Commuter-related data is now split into `CommuterSummary` and `CommuterDetail` fields.
  - `CommuterSummary` is loaded / requested at a dataset level and power the Overview Panel
  - `CommuterDetail` contains region/region commuter counts and is requested per region from the Info Panel
- Added in-session state persistence for `Regions Overview` controls (tab/search/sort/dataset) across close/reopen, with reset on city change.

### Other Updates

- Improved infrastructure computation performance by applying boundary-grid candidate filtering for both existing region-based and new dataset-level infrastructure computations.
- All overview panel columns are now sortable and show `Loading...` placeholders while async (commuter / infra) data is being computed.

## v0.2.6 - 2026-02-15

_Game version_ v1.0.3

### New Features

- Migrated `Region Info` from a legacy DOM-only implementation to one that is fully React-based
  - This encompasses both the `Statistics` and `Commuters` view as well as all components (Inline Toggle, Detail Row, etc.) that were previously DOM-only
- Added a dedicated React root for `Region Info` mounted into the top-left UI container

### Other Updates

- Removed legacy DOM `Region Info` panel code paths and related dead renderer/fallback logic.
- Improved UI commuters controls and injected toggles (control brightness, checkbox/check icon sizing, label hover styling).

## v0.2.5 - 2026-02-14

_Game version_ v1.0.3

### Other Updates

- Prepare for settings panel by handling two global configuration options:
  - `ENFORCE_ONE_DATASET_VISIBLE` => only allow one dataset's map layers to be rendered/visible at the same time
  - `SHOW_UNPOPULATED_REGIONS` => show/hide regions that are not assigned any demand points by the game's demand data

## v0.2.4 - 2026-02-14

_Game version_ v1.0.3

### Other Updates

- Refactored `RegionsOverviewPanel` and the React-version `DataTable` to be stateful components using React's `useState`.
  - `RegionsOverviewPanel` no longer needs to be force rerendered through the game API on state update.

### Bugfixes

- Fixed Overview table row hover and selected state highlights not rendering.
- Re-selecting a region using Overview table now correctly toggles off selection if the region was already selected.

## v0.2.3 - 2026-02-13

_Game version_ v1.0.2

### Bugfixes

- Updated overview selection flow to ensure the selected dataset layer is made visible before applying active selection state.
- Overview selections now also sync map layer toggles correctly
- Clearing a dataset layer now clears active selection (and therefore closes `Region Info`) when the active selection belongs to that dataset.

## v0.2.2 - 2026-02-13

_Game version_ v1.0.2

### New Features

- Added support for limited boundaries outside of GB/US via `source_data/osm-country-admin-levels.json`.
  - Statically defined with a few example configs, requires user update for use with any other countries
- Updated shared data/`data_index.json` schema to include some metadata fields
  - :warning: this is breaking change so old iterations of `data_index.json` will need to be cleared before using this version of the mod.
- Added extraction preview mode for inspecting queried feature samples before writing outputs.

### Other Updates

- Updated extraction CLI to accept both kebab-case and camelCase argument keys (e.g. `--country-code` / `--countryCode`).
- Added boilerplate retry/error handling helper for HTTP queries to OSM/ArcGIS/ONS/etc.
- `data/data_index.json` now has deterministic alphabetical ordering.
  - Cities are sorted by their city code, and each entry for a city is sorted by the dataset's ID.

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
