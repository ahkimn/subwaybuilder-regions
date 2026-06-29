# Plan of Record — Special Demand View (Enhanced Demand View mod)

[Back to mod README](./README.md)

|              |                                                       |
| ------------ | ----------------------------------------------------- |
| **Status**   | Draft / in progress                                   |
| **Owner**    | Alex Kimn                                             |
| **Created**  | 2026-06-18                                            |
| **Branch**   | `feature/edv-special-demand-view` (off `origin/main`) |
| **Worktree** | `C:/Users/AlexK/Github/subwaybuilder-regions-edv`     |

---

## 1. Motivation

The Enhanced Demand View (EDV) mod was built to **replace** the game's `demand-points`
deck.gl layer in order to (a) resize demand dots and (b) kill a hover-driven `setProps`
performance storm. Two things change that calculus:

1. The game is expected to expose a **dot-resize API** — so we no longer need a layer
   takeover just to scale dots. The existing scaling sliders should consume that API.
2. We now want a **"special demand" view**: filter / highlight demand points by category
   (airport, school, university, hospital, …) using the `special_demand` datasets produced
   by the `subwaybuilder-jp-data` pipeline and packaged by the Railyard app.

The base game demand view **stays**. The special-demand view is **additive** (see §5).

## 2. Goals / Non-goals

**Goals**

- Ingest the per-map `special_demand_points.json` + shared `special_demand_types.json`
  sidecars at runtime via a lightweight relative-directory probe.
- Render a filter/highlight UI populated from the type taxonomy (localized labels + Lucide
  icons), letting the user show/highlight demand points by type/sub-type.
- Join special-demand points to live demand data to drive rendering and selection.
- Keep the existing settings panel + scaling sliders; wire them to the game resize API
  when it lands.

**Non-goals (for now)**

- Replacing the base demand view (deferred decision — see §5).
- Authoring/editing special-demand data (read-only consumer).
- Server-fetched datasets (local-only, like Regions static discovery).

## 3. Data model & sources

Canonical schemas live in `Railyard/foundry/schemas/`, published as the npm package
`@subway-builder-modded/special-demand-schemas` (GitHub Packages, `@subway-builder-modded`
scope; Railyard is at v0.2.0, jp-data pins `^0.1.0` — watch skew).

- **Type definitions (spec)** — `special_demand_types.json`: taxonomy of `DemandType`
  (`id`, `code`, localized `label`/`description`, Lucide `icon`, optional `sub_types`).
  Source of truth is the Python registry
  `subwaybuilder-jp-data/src/pipeline/stages/phase_e/special_demand_types_data.py`
  (`SCHEMA_VERSION`, `SPECIAL_DEMAND_TYPES`), generated to JSON by
  `scripts/generate_special_demand_types.py`. Note its `$schema` is
  `special_demand_type_definitions.schema.json` and it carries `schema_package_version`.
- **Per-map points (data-link)** — `special_demand_points.json`: `map_code` + `points[]`,
  each `{ point_id, type, sub_type, name(localized), pop_ids[], sibling_point_ids[],
metadata }`. Finalized in Phase F
  (`src/pipeline/stages/phase_f/special_demand_finalize.py`).

**Emission → sidecar path.** jp-data gzips both into `export/<city>/*.json.gz`;
`scripts/release/prepare_releases.py` decompresses them into the map release archive at
`.railyard_map/special_demand_types.json` and `.railyard_map/special_demand_points.json`.
The Railyard app extracts each map into the local cities dir, where the sidecars land
**uncompressed** next to `demand_data.json`:

```
<cities>/data/<CODE>/
  demand_data.json.gz
  config.json
  .railyard_map/
    special_demand_points.json     # per-map
    special_demand_types.json      # shared
    landuse_provenance.parquet
```

Local reference: `C:/Users/AlexK/AppData/Roaming/metro-maker4/cities/data/<CODE>/.railyard_map/`
(confirmed present for e.g. `HKP`).

## 4. Runtime ingestion

The mod does **not** know the absolute cities path. Resolve it relative to a known city
data URL:

- `api.cities.getCityDataFiles(cityCode).demandData` → URL to `demand_data.json[.gz]`.
- Strip the filename, append `.railyard_map/special_demand_points.json` (and
  `…/special_demand_types.json`), then `fetch()` — mirroring Regions' `file:///` probe.

This is the "quick probe of a relative directory" analogous to Regions' static dataset
discovery. **Action:** extract Regions' probe primitives
(`mods/regions/core/storage/helpers.ts`: `tryDatasetPath`, path builders) into a shared
`lib/` helper consumed by both mods (see §7 / task T2).

### The join (no layer takeover needed)

`api.gameState.getDemandData()` returns `DemandDataFile`:
`points[] = { id, location, jobs, residents, popIds[] }`, `pops[] = { id, size, … }`.

- `special_demand_points[].point_id` ↔ `demandData.points[].id` → yields `location` for
  rendering highlights directly.
- `special_demand_points[].pop_ids[]` ↔ `demandData.points[].popIds[]` for demand mass.

Because geometry comes from the API, we can render an **additive** overlay from
`demandData.points` filtered to special-demand membership — without intercepting the game's
deck.gl `setProps` or hiding the base layer.

## 5. Architecture decision — additive overlay vs takeover

**Decision: build additive; defer the takeover question until the resize API ships.**

- **Additive overlay (default):** add a new MapLibre layer (`edv-special-demand`) sourced
  from the API join above; base demand view untouched. Click/hover surfaces the point's
  name/type/metadata.
- **Takeover (deferred):** only revisit if filtering _visually requires_ replacing the base
  layer (e.g. dimming non-matching points the game renders). Leave the existing Option B/C
  code in place, untouched, until then.

## 6. Listener / interception changes vs. today

| Piece                                                 | Today                                                | Plan                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `DemandHoverSuppressor` (Option B)                    | removes `_updateHover`/`setCameraCenter` listeners   | **Drop** — hover is now desired; suppressing it fights the goal.       |
| `DemandLayerManager` takeover (Option C)              | hides base layer, patches add/removeLayer + setProps | **Keep untouched, deferred** (§5). New view does not use it.           |
| `DemandLayerObserver`                                 | diagnostics                                          | **Remove.**                                                            |
| `setProps({data})` intercept                          | only way to see demand geometry                      | **Not needed** — `getDemandData()` replaces it.                        |
| map render settings (`renderWorldCopies`, tile cache) | OOM mitigation                                       | Orthogonal; keep on own merits.                                        |
| `ModLifecycle` hooks + `_isActive` guard              | city/map/gameEnd                                     | **Keep**; cherry-pick `_isActive` guard from `additional-edv-changes`. |
| NEW: click/hover on `edv-special-demand`              | —                                                    | **Add** for point detail UI.                                           |

## 7. Work breakdown (tracking)

- [x] **T1 — DONE.** Consume `@subway-builder-modded/special-demand-schemas` (validators +
      types + schema JSONs). `.npmrc` (scope → GitHub Packages, `_authToken=${NODE_AUTH_TOKEN}`) + `^0.2.0` dep in root `package.json`. Installed (`read:packages` token); verified
      import-by-name + `validateSpecialDemandPoints` ✓ on real HKP data. Also moved
      `@rollup/rollup-linux-x64-gnu` to `optionalDependencies` so plain `npm install` works on
      Windows (was a hard dep → `EBADPLATFORM`; Linux CI `npm ci` still gets it).
      **Validate leniently** (log + proceed, never hard-fail) — see §8 skew finding. → §3
- [ ] **T2 — Shared local-probe helper.** Extract Regions' `tryDatasetPath` + path builders
      into `lib/`; refactor Regions to consume it; use it for EDV sidecar probe. → §4
- [ ] **T3 — Sidecar loader.** Resolve `.railyard_map` path from `getCityDataFiles`, fetch + parse + (optionally) validate the two docs; typed model. → §4
- [ ] **T4 — Join + domain model.** Join points ↔ `getDemandData()`; resolve `sibling_point_ids`;
      expose typed special-demand point list w/ location + type. → §4
- [ ] **T5 — Filter/highlight UI.** Type/sub-type menu from the taxonomy (icons + localized
      labels), wired into the existing settings/panel infra. → §1
- [ ] **T6 — Additive overlay layer.** `edv-special-demand` MapLibre layer + click/hover
      detail. → §5
- [ ] **T7 — Scaling sliders → resize API.** Replace the `// TODO: Propagate scaling` stub
      once the game resize API exists. → §1
- [ ] **T8 — Cleanup.** Remove `DemandLayerObserver` + `DemandHoverSuppressor`; decide on
      Option C after resize API ships. → §6

## 8. Open questions / risks

- **Resize API shape & timing** — unknown; T7 and the Option C decision depend on it.
- **npm auth in mod release CI** — GitHub Packages needs a token; not anonymous.
- **Version skew (CONFIRMED via real data).** Validating HKP's extracted
  `.railyard_map` files against v0.2.0: `special_demand_points.json` passes
  (`validateSpecialDemandPoints` ✓), but `special_demand_types.json` has `version: 5` with
  **no `schema_package_version`** (which v0.2.0 requires for `version ≥ 5`), so the type +
  dataset validators fail. The dataset cross-check also caught a producer drift
  (`Unknown sub_type "acute" for type "hospital"`). ⇒ Loader validates leniently: hard
  requirement only on points-shape; type-doc + cross-doc results are logged as warnings,
  never fatal. Revisit once producers emit `schema_package_version`.
- **Sidecar availability** — only maps built through the current pipeline have
  `.railyard_map/special_demand_*`; the mod must degrade gracefully when absent (Phase F's
  `.exists()` guard means points may legitimately be missing).
- **Locale selection** — `name`/`label` are `{ __default__, <bcp47> }`; pick the game's
  active locale with `__default__` fallback.

## 9. References

- Mod: `mods/enhanced-demand-view/` (this repo)
- Schemas + validators: `Railyard/foundry/schemas/` (`special_demand_*.schema.json`, `src/index.ts`)
- Producer: `subwaybuilder-jp-data/src/pipeline/stages/phase_e/special_demand_types_data.py`,
  `…/phase_f/special_demand_finalize.py`, `scripts/generate_special_demand_types.py`,
  `scripts/release/prepare_releases.py`
- Regions probe pattern: `mods/regions/core/storage/helpers.ts`,
  `mods/regions/core/registry/RegionDatasetRegistry.ts` (`locateStaticLocalDatasets`)
- API surface: `lib/types/api.d.ts` (`cities.getCityDataFiles`, `gameState.getDemandData`),
  `lib/types/schemas.d.ts` (`DemandDataFile`), `lib/types/cities.d.ts` (`CityDataFiles`)
