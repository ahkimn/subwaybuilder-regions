# subwaybuilder-regions

Monorepo for [SubwayBuilder](https://www.subwaybuilder.com/) mods, built on a shared core library.

## Mods

### Regions

Imports real-world geographic regions (ZIP codes, counties, wards, etc.) into SubwayBuilder, adding interactive map layers and panels for population, commuter flows, and infrastructure statistics.

<!-- BEGIN regions status -->

| | |
| --- | --- |
| **Latest Version** | [`v0.4.8`](docs/regions/CHANGELOG.md#v048) |
| **Game Version** | `v1.2.0` |
| **Released** | 2026-04-05 |
<!-- END regions status -->

[Full documentation](docs/regions/README.md) | [Changelog](docs/regions/CHANGELOG.md) | [Known Issues](docs/regions/KNOWN_ISSUES.md)

### Enhanced Demand View

Enhances the in-game demand visualization. Releases are published to the sister repository [`subwaybuilder-enhanced-demand-view`](https://github.com/ahkimn/subwaybuilder-enhanced-demand-view).

<!-- BEGIN enhanced-demand-view status -->

| | |
| --- | --- |
| **Latest Version** | [`v0.1.0`](docs/enhanced-demand-view/CHANGELOG.md#v010) |
| **Game Version** | `v1.2.0` |
| **Released** | 2026-04-07 |
<!-- END enhanced-demand-view status -->

[Changelog](docs/enhanced-demand-view/CHANGELOG.md) | [Known Issues](docs/enhanced-demand-view/KNOWN_ISSUES.md)

## Repository Structure

```
lib/                          Shared core library (UI primitives, types, geometry)
mods/
  regions/                    Regions mod source, manifest, fetch scripts
  enhanced-demand-view/       Enhanced Demand View mod source, manifest
scripts/                      Build, extraction, and dev tooling
docs/
  regions/                    Regions CHANGELOG, KNOWN_ISSUES, full README
  enhanced-demand-view/       Enhanced Demand View CHANGELOG, KNOWN_ISSUES
  RELEASING.md                Release process for all mods
  PRESET_DATA_REFERENCE.md    Dataset reference for extraction scripts
```

## Getting Started

```bash
git clone https://github.com/ahkimn/subwaybuilder-regions.git
cd subwaybuilder-regions
npm install
```

### Build

```bash
npm run build                           # Build all mods
npm run build:regions                   # Build regions only
npm run build:enhanced-demand-view      # Build enhanced-demand-view only
```

### Development

Requires a `config.yaml` (see `config.example.yaml`).

```bash
npm run build:dev                       # Build regions, symlink, launch game
npm run symlink                         # Symlink all mods into game directory
npm run serve                           # Serve region data via local HTTP
npm run dev                             # Launch game with console enabled
```

### Quality Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

## Release Process

See [RELEASING.md](docs/RELEASING.md) for full details. In short, each mod is versioned independently via its own `CHANGELOG.md`. On release, the changelog is the source of truth — manifest versions and this README's status tables are synced automatically.

Tagging `regions-vX.Y.Z` triggers the regions release workflow. Tagging `enhanced-demand-view-vX.Y.Z` triggers the enhanced-demand-view release workflow.

## Credits

Developed by [ahkimn](https://github.com/ahkimn)

MIT License
