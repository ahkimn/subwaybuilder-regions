# subwaybuilder-regions

This repository contains a standalone mod, **SubwayBuilder Regions**, for the game [SubwayBuilder](https://www.subwaybuilder.com/).

## Summary

> **SubwayBuilder Regions** allows users to import real-world geographic regions (e.g. ZIP codes, counties, wards) into the game SubwayBuilder,
>
> The mod adds a visualization layer on top of the in-game map as well as additional panels for region-based statistics such as population, commuter flows, and infrastructure.

_Latest Mod Version:_ `v0.1.0`  
_Latest Tested Game Version:_ `v0.12.6`

## Table of Contents

- [Features](#features)
- [Specifications](#specifications)
- [Usage](#usage)
  - [General User Installation](#general-user-installation)
  - [Dev Installation](#dev-installation)
- [Planned Features](#planned-features)
- [Known Issues](#known-issues)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [Credits](#credits)

## Features

- **Interactive Map Layers**: Displays region-based data as interactive layers on the in-game map.
  - Multi different region layers can be loaded per city
  - Each region layer is exposed in the game's `Map Layers` toggle screen
- **Region-Level Information**: Information for the following is exposed to the user when a region is selected:
  - Region Characteristics (total population / area / etc.)
  - Commuter Data (origin / destination by region / etc.)
  - Infrastructure Data (station count / track length / routes / etc.)
- **Dynamic Data State**: Region-based data is dynamically updated based on the game state
  - :information_source: Currently, this is limited to just the commuter data
- **Preset Regions**: Scripts to obtain region boundaries for the following real-world geographical divisions are provided:
  - **GB** (United Kingdom)
    - Local Authority Districts
    - Built-up Areas
    - Electoral Wards
  - **US** (United States)
    - Counties
    - County Subdivisions (including towns/cities/CDPs)
    - ZIP Code Tabulation Areas

## Specifications

- **Region Data**:
  - Region boundary data is stored on the local machine in GeoJSON format
  - :warning: Features must have Polygon/MultiPolygon geometry
  - :warning: Overlapping boundary data will likely cause issues. Avoid if possible during pre-processing
- **Local Data Server**:
  - Currently, data is exposed to the game via a configurable local HTTP server (`scripts/serve-data.ts`)
  - This will be moved to local storage as the mod API matures
- **Key Files/Directories**:
  ```
  - data/                   -- Output directory for boundary data
    - data_index.json       -- JSON file of available datasets (for consumption by mod)
  - scripts/                -- Scripts for downloading / serving local data
  - src/                    -- Core mod logic
  - shared/                 -- Shared values between dev / runtime
  - source_data/            -- Folder for pre-downloaded boundary source data
    - boundaries.csv        -- CSV of city codes to boundary boxes
  ```

### GeoJSON Feature Requirements

- **Required**
  - `ID` – unique identifier
  - `NAME`

- **Optional**
  - `DISPLAY_NAME`
  - `POPULATION`
  - `TOTAL_AREA`
  - `AREA_WITHIN_BBOX`

## Usage

### General User Installation

> :warning: This mod currently does not have a prebuilt release.
> General users will need to wait for a release package to be available.

### Dev Installation

1. Clone repository & Install dependencies

   ```
     git clone https://github.com/ahkimn/subwaybuilder-regions.git;
     cd subwaybuilder-regions;
     npm install
   ```

2. Update City Config (Optional)

   The `boundaries.csv` contains the boundary box for clipping regions to all of the game's current cities. If you are working on a custom city, please add an entry for the custom city within the file

3. Build Boundary GeoJSONs

   From the project repository root, run

   ```
   npm run extract:map-features -- \
     --country-code=US \
     --data-type=zctas \
     --city-code=DEN \
   ```

   Or to override the boundaries set in `boundaries.csv`, manually provide a boundary box

   ```
   npm run extract:map-features -- \
     --country-code=US \
     --data-type=zctas \
     --city-code=DEN \
     --west=-105.2 \
     --south=39.5 \
     --north=40.1 \
     --east=-104.6
   ```

   This command generates clipped GeoJSON files under `data/`, which are later served to the game via the local data server.

   **Preset Parameters**

   The following are the current valid combinations of `country-code` and `data-type` for preset data

   | `country-code` | `data-type `        | description                             | source                |
   | -------------- | ------------------- | --------------------------------------- | --------------------- |
   | **GB**         | districts           | Local Authority Districts (LADs)        | ONS (online)          |
   | **GB**         | bua                 | Built Up Areas                          | ONS (online)          |
   | **GB**         | wards               | Electoral Wards                         | ONS (online)          |
   | **US**         | counties            | Counties                                | TIGERweb API (online) |
   | **US**         | county-subdivisions | County Subdivisions (Towns/Cities/CDPs) | TIGERweb API (online) |
   | **US**         | zctas               | ZIP Code Tabulation Areas               | TIGERweb API (online) |

   :warning: If boundaries are not provided, `city-code` must be in `boundaries.csv`

4. Serve Local Data
   From the repository root, run:

   ```
   npm run serve
   ```

   By default this serves: http://127.0.0.1:8080.

5. Build
   From the repository root, run:

   ```
   npm run build
   ```

   This will build the `index.js` in `dist/`

6. Install

   Move or the built `index.js` as well as the mod's `manifest.json` in the root directory to the mod's folder in the game's mod directory.

   Alternatively, use the following command (requires `config.yaml`) to create symlinks between the dev folder and the mod directory:

   ```
   npm run link
   ```

   The `config.yaml` file can be created from `config.example.yaml` and updating the `gamePath` / `baseModsDir` / `modDirName`.

7. Dev Launch (Optional)

   Configure `config.yaml`. Then, use the following command to run the game from terminal with the Console enabled.

   ```
   npm run dev
   ```

### Disclaimer

> :warning: This mod was developed on Windows, behavior on other platforms is undetermined
>
> If you encountered issues while working with the mod, please:
>
> - Raise an issue (see [Contributing](#contributing)) on the repository
> - Send a message within the mod's dedicated thread within the game's [Discord server](https://discord.gg/97JhJprW)

## Planned Features

List of features that are feasible and may be added in the near future. Those with :construction: are currently under implementation

### Major Features

- **Better Data Imports**
  - Mod expects GeoJSONs with features that have specific properties.
    - A conversion script is possible, but this is a brittle contract for any user-imported data
  - Allow users to import preset regions directly from the game
- **Settings**
  - Mod-level settings should be added in the main menu. This could include:
    - Metric/Imperial conversion
    - Hotkey modification,
    - etc.
- :construction: **Aggregate Data View**
  - Add a new table component to show all region statistics at a glance
  - Sync data / selection state across multiple panels
- **Hotkey Support**
  - Game panels should respond to in-game hotkeys as other parts of the existing game UI do (e.g. Esc to clear panel / selection)

### Minor Features

- **Better Preset Data**
  - More Comprehensive GB Population Data
    - GB population data is spotty due to inconsistent IDs between data years
  - Label Generation Improvements (heuristic scoring of different candidate labels)
  - More descriptive `type` for individual regions (e.g. _town_, _city_, _township_, _CDP_) for county subdivisions
- **Visual Updates + Theme Integration**
  - Game currently assumes it is being run on the default game Dark mode, but some recoloring will be required to support the default Light mode
  - Once mod-level settings are added:
    - Custom color palettes to override presets
    - Data-linked coloring of labels/statistics (e.g. apply in-game demand bubble coloring for mode share stats)
- **Special Demand Point Data**
  - Show special demand points within the info view of a region (e.g. Airports/Universities/etc.).
  - This isn't well documented in the API and I will probably wait for clarity if the current pattern of ({PREFIX}\_{ID}) can be relied on

### Ideation

Some additional features that will likely remain just ideas for the foreseeable future

- **Editable / Dynamic User Regions**
  - Users should be able to define / edit region boundaries within the game UX
  - Implementation?
    - Based on existing demand points (allow user to select subset, build boundaries around selection)
    - Based on existing layers (integrate with the game's existing map layers, snap to roads, water, etc.)
- **Core Game Mechanic Integration** (Requires new API hooks/functions)
  - Commute costs
    - Region-based fares / driving cost (e.g. congestion pricing zone)
  - Dynamic demand
    - Region-differentiated demand growth / decline (perhaps in the form of region-level policies)
  - Construction
    - "Enable/disable" construction for certain regions (e.g. pay to unlock new areas to build on, or be paid to expand to a region by X time)
    - Region-based construction cost multipliers

## Known Issues

### Major Bugs

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

### Minor Bugs / Issues

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

## Changelog

### v0.1.0 — 2026-02-09 (Initial Release)

_Game version_ v0.12.7

#### Updates

- Added visualization for preset region boundaries + labels
- Added information panel when a user selects a region within the game
  - Panel contains region summary statistics as well as commuter / infrastructure data
- Added initial dev scripts to fetch/process data for preset cities

#### Bugfixes

- None (initial bugs added)

## Contributing

Issues and Pull Requests are welcome. Please include:

- Game version
- Mod version
- Platform
- Other Relevant Details

## Credits

Mod developed by [ahkimn](https://github.com/ahkimn)

MIT License
