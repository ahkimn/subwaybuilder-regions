# Planned Features

[Back to README](../README.md)

This document contains a snapshot of features under consideration for the SubwayBuilder Regions mod, grouped by complexity and priority.
Those with :construction: are currently under implementation.

## Major Features

- **Better Data Imports** (Added in 0.4.0)
  - The Regions mod now enables users to download GeoJSON files directly from the Settings menu
  - The process involves the user copying a set command into terminal to download using a script included in the release package
- :construction: **Settings**
  - Mod-level settings should be added in the main menu. This could include:
    - Metric/Imperial conversion
    - Hotkey modification,
    - etc.
- :construction: **Aggregate Data View**
  - New `Overview Panel` to show cross-region statistics at a glance
  - Selection / data state should be synced across tabs
  - Current progress:
    - Floating panel host has been implemented using the game panel API
    - Initial overview UX is in place (layer selector, tabs, search, sortable table shell)
    - Selection sync is wired between overview, map highlights, and info panel
- **Hotkey Support**
  - Game panels should respond to in-game hotkeys as other parts of the existing game UI do (e.g. Esc to clear panel / selection)

## Minor Features

- :construction: **Better Preset Data**
  - More Comprehensive GB Population Data
    - GB population data is spotty due to inconsistent IDs between data years
  - Label Generation Improvements (heuristic scoring of different candidate labels)
  - :white_check_mark: Support for other nations via OSM data
  - :white*check_mark: More descriptive `type` for individual regions (\_town*, _city_, _township_, _CDP_) for county subdivisions
- **Visual Updates + Theme Integration**
  - Game currently assumes it is being run on the default game Dark mode, but some recoloring will be required to support the default Light mode
  - Once mod-level settings are added:
    - Custom color palettes to override presets
    - Data-linked coloring of labels/statistics (e.g. apply in-game demand bubble coloring for mode share stats)
- **Special Demand Point Data**
  - Show special demand points within the info view of a region (e.g. Airports/Universities/etc.).
  - This isn't well documented in the API and I will probably wait for clarity if the current pattern of ({PREFIX}\_{ID}) can be relied on

## Ideation

Some additional features that will likely remain just ideas for the foreseeable future.

- **Editable / Dynamic User Regions**
  - Users should be able to define / edit region boundaries within the game UX
  - Implementation?
    - Based on existing demand points (allow user to select subset, build boundaries around selection)
    - Based on existing layers (integrate with the game's existing map layers, snap to roads, water, etc.)
- **Core Game Mechanic Integration** (Requires new API hooks/functions)
  - Commute costs
    - Region-based fares / driving cost (e.g. congestion pricing zone)
  - Dynamic demand
