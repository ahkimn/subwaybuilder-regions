# subwaybuilder-regions

This repository contains a standalone mod, **SubwayBuilder Regions**, for the game [SubwayBuilder](https://www.subwaybuilder.com/).

## Summary

> **SubwayBuilder Regions** adds real-world geographic regions (e.g. ZIP codes, counties, wards) to the game SubwayBuilder,
> allowing players and modders to visualize region-based statistics such as population, commuter flows, and infrastructure.

## Table of Contents

- Features
- Specifications
- Usage
  - Installation
  - Data Preparation
- Planned Features
- Known Issues
- Changelog
- Contributing
- Credits

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
  - Region boundary data is stored on the local machine in GeoJSON format,
  - :warning: Features must have Polygon/MultiPolygon geometry
  - :warning: Required feature properties
    - ID (unique identifier)
    - NAME
  - Optional properties
    - DISPLAY_NAME
    - POPULATION
    - TOTAL_AREA
    - AREA_WITHIN_BBOX
  - :warning: Overlapping boundary data will likely cause issues. Avoid if possible during pre-processing
- **Local Data Server**:
  - Currently, data is exposed to the game via a configurable local HTTP server (`scripts/serve-data.ts`)
  - This will be moved to local storage as the mod API matures
- **Directories**:
  ```
  - data/         -- Output directory for boundary data
  - scripts/      -- Scripts for downloading / serving local data
  - src/          -- Core mod logic
  - source_data/  -- Folder for pre-downloaded boundary source data
  ```

## Usage

> :warning: This mod currently does not ship prebuilt binaries.
> General users will need to wait for a `dist/` release.

### Dev Installation

1. Clone repository & Install dependencies

```
  git clone https://github.com/ahkimn/subwaybuilder-regions.git;
  cd subwaybuilder-regions;
  npm install
```

2. Download Source Data (Optional)

// TODO: Create a script to download GB data for local use

3. Update City Config (Optional)
   - The `boundaries.csv` contains the boundary box for clipping regions to all of the game's current cities. If you are working on a custom city, please add an entry for the custom city within the file

4. Build Boundary GeoJSONs

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

The following are the current valid combinations of `country-code` and `data-type` for preset data

| `country-code` | `data-type `        | description                             | source                |
| -------------- | ------------------- | --------------------------------------- | --------------------- |
| **GB**         | districts           | Local Authority Districts (LADs)        | ONS (offline)         |
| **GB**         | bua                 | Built Up Areas                          | ONS (offline)         |
| **GB**         | wards               | Electoral Wards                         | ONS (offline)         |
| **US**         | counties            | Counties                                | TIGERweb API (online) |
| **US**         | county-subdivisions | County Subdivisions (Towns/Cities/CDPs) | TIGERweb API (online) |
| **US**         | zctas               | ZIP Code Tabulation Areas               | TIGERweb API (online) |

:warning: If boundaries are not provided, `city-code` must be in `boundaries.csv`

5. Serve Local Data
   From the repository root, run:

```
npm run serve
```

By default this serves: http://127.0.0.1:8080.

6. Build
   From the repository root, run:

```
npm run build
```

This will build the `index.js` in `dist/`

7. Install
   Move or symlink the built `index.js` as well as the mod's `manifest.json` in the root directory to the mod's folder in the game's mod directory.

:warning: This mod was developed on Windows, behavior on other platforms is undetermined

- Please raise issues on this repository or within the dedicated thread within the game's [Discord server](https://discord.gg/97JhJprW) if you encounter any issues.

## Planned Features

List of features that are planned to be implemented in the near future and their status

#### Major Features

- **Hotkey Support**
  - Game panels should respond to in-game hotkeys as other parts of the existing game UI do (e.g. Esc to clear panel / selection)
- **Better Data Imports**
  - Mod expects GeoJSONs with features that have specific properties.
  - A conversion script is possible, but this is a brittle contract for any user-imported data
- **Settings**
  - Mod-level settings should be added in the main menu. This could include:
    - Metric/Imperial conversion
    - Hotkey modification,
    - etc.
- :construction: **Aggregate Data View**
  - Add a new table component to show all region statistics at a glance

#### Minor Features

- **Special Demand Point Data**
  - Show special demand points within the info view of a region (e.g. Airports/Universities/etc.).
  - This isn't well documented in the API and I will probably wait for clarity if the current pattern of ({PREFIX}\_{ID}) can be relied on
- :construction: **Better Preset Data**
  - US data is fetched from TIGERweb REST API; however, GB data is generated using (very large) downloaded GeoJSONs
  - GB population data is spotty due to inconsistent IDs between data years
- **Theme Integration**
  - Game currently assumes it is being run on the default game Dark mode, but some recoloring will be required to support the default Light mode
  - Custom colorization (powered by mod settings when implemented)

#### Ideation

Some additional potential features that will likely remain ideas for the foreseeable future

- **Editable / Dynamic User Regions**
  - Users should be able to define / edit region boundaries within the game UX
  - Implementation?
    - Based on existing demand points (allow user to select subset, build boundaries around selection)
    - Based on existing layers (integrate with the game's existing map layers, snap to roads, water, etc.)
- **Core Game Mechanic Integration**
  - Commute costs
    - Region-based fares / driving cost (e.g. congestion pricing zone)
  - Dynamic demand
    - Region-differentiated demand growth / decline (perhaps in the form of region-level policies)
  - Construction
    - "Enable/disable" construction for certain regions (e.g. pay to unlock new land to build on)
    - Region-based construction cost multipliers

## Known Issues

#### Major Bugs

Bugs that break core mod functionality and lead to unexpected mod state / crashes are listed here. These will be addressed in the near future

1. _Unsynced Map Layers_
   - Custom map layers are reset when:
     - A default data view (e.g. demand point) is opened
     - Render angle changes (zoom seems to not trigger this)
   - The toggle state shown in the `Map Layers` panel is not synced to this reset
   - **Workaround**: Reset the toggle to the empty state, then toggle again to reattach the map layer
2. _Hot-reload inconsistencies_
   - `onCityLoad()` and `onMapReady()` are not always re-triggered on hot-reload
   - As a result, the mod can be placed into an inconsistent state
   - **Workaround**: fully reload a city to reset the mod state

#### Minor Bugs / Issues

Bugs or issues that are inconvenient but do not break the core mod functionality are listed here

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

## Changelog

#### Last Update

> :information_source: Last updated: 2026-02-08  
> :information_source: Last checked game version  
> :warning: Mod behavior may be unstable with future updates

## Contributing

Issues and Pull Requests are welcome. Please include:

- Game version
- Mod version
- Platform
- Other Relevant Details

## Credits

Mod developed by [ahkimn](https://github.com/ahkimn)

MIT License
