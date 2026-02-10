# subwaybuilder-regions

This repository contains a standalone mod, **SubwayBuilder Regions**, for the game [SubwayBuilder](https://www.subwaybuilder.com/).

## Summary

> **SubwayBuilder Regions** allows users to import real-world geographic regions (e.g. ZIP codes, counties, wards) into the game SubwayBuilder,
>
> The mod adds a visualization layer on top of the in-game map as well as additional panels for region-based statistics such as population, commuter flows, and infrastructure.

_Latest Mod Version:_ `v0.1.0`  
_Latest Tested Game Version:_ `v0.12.7`

## Table of Contents

- [Features](#features)
- [Specifications](#specifications)
- [Installation](#installation)
  - [General User Installation](#general-user-installation)
  - [Dev Installation](#dev-installation)
- [Usage](#usage)
- [Planned Features](PLANNED_FEATURES.md#planned-features)
- [Known Issues](KNOWN_ISSUES.md#known-issues)
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

## Installation

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

## Usage

TODO

## Planned Features

See [PLANNED_FEATURES.md](PLANNED_FEATURES.md) for the current list of planned features and long-term ideas.

## Known Issues

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for the current list of major/minor issues and workarounds.

## Changelog

### v0.1.0 — 2026-02-10 (Initial Release)

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
