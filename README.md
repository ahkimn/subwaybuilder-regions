# subwaybuilder-regions

This repository contains a standalone mod, Regions, for the game SubwayBuilder.

As the name suggests, this mod allows users to import real-world and custom-defined regions into the game.

## Features

- **Interactive Map Layers**: Displays region-based data as interactive layers on the in-game map.
  - Multi different region layers can be loaded per city
  - Each region layer is exposed in the game's `Map Layers` toggle screen
- **Region-Level Information**: Information for the following is exposed to the user when a region is selected:
  - Region Characteristics (total population / area / etc.)
  - Commuter Data (origin / destination by region / etc.)
  - Infrastructure Data (station count / track length / routes / etc.)Mod expects GeoJSONs with features that have specific properties. This is a brittle contract for any user-imported data.
- **Dynamic Data State**: Region-based data is dynamically updated based on the game state
  - _Disclaimer_: Currently, this is limited to just the commuter data

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
  - [!WARNING] Features must have Polygon/MultiPolygon geometry
  - [!WARNING] Required feature properties
    - ID (unique identifier)
    - NAME
  - Optional properties
    - DISPLAY_NAME
    - POPULATION
    - TOTAL_AREA
    - AREA_WITHIN_BBOX
  - [!WARNING] Overlapping boundary data will likely cause issues. Avoid if possible during pre-processing
- **Local Data Server**:
  - Currently, data is exposed to the game via a configurable local HTTP server (`scripts/serve-data.ts`)
  - This will be moved to local storage as the mod API matures

## Usage

## Planned Features

Here's a list of some major/minor features I plan to work on in the near future and their status

#### Major Features

- Dynamic User Regions
  - Users should be able to define / edit region boundaries within
  - First iteration will revolve around selecting demand points to include/exclude
- TEST

#### Minor Features

- Special Demand Point Data
  - Show special demand points within the info view of a region (e.x. Airports/Universities/etc.).
  - This isn't well documented in the API and I will probably wait for clarity if the current pattern of ({PREFIX}\_{ID}) can be relied on
- Better Data Imports
  - Mod expects GeoJSONs with features that have specific properties.
  - We can provide a conversion script, but this is a brittle contract for any user-imported data
- Better Preset Data
  - US data is fetched from TIGERweb REST API; however, GB data is generated using (very large) downloaded GeoJSONs
  - GB population data is spotty due to inconsistent IDs between data years

# Known Bugs

1. Unysnced Map Layers
   - Custom map layers are reset when:
     - A default data view (e.x. demand point) is opened
     - Render angle changes (zoom seems to not trigger this)
   - The toggle state shown in the `Map Layers` panel is not synced to this reset
   - **Workaround**: Reset the toggle to the empty state, then toggle again to reattach the map layer
2. Hot-reload inconsistencies
   - `onCityLoad()` and `onMapReady()` are not always re-triggered on hot-reload
   - As a result, the mod can be placed into an inconsistent state
   - **Workaround**: fully reload a city to reset the mod state

# Known Issues

This section is to keep track of things that need to be addressed in the near future, when planned features are rolled out, but are not bugs.

1. Unassigned regions should not be clickable in any info panel
2. Default feature bounds are not accurate and should be replaced either with a demand-based boundary OR a pre-set polygon provided by API / User
3. Excessive console outputs.

- Should be toggleable in a debug mode via mod-level settings

4. DOM injection for `Map Layers` toggles should be replaced by API calls in the future
5. Class-based root-finding and explicit DOM injection for the info panel should be replaced by API call
6. TOTAL_AREA/
