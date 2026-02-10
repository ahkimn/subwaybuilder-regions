# Planned Features

[Back to README](README.md)

This document contains a snapshot of features under consideration for the SubwayBuilder Regions mod, grouped by complexity and priority.
Those with :construction: are currently under implementation

## Major Features

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

## Minor Features

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

## Ideation

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
