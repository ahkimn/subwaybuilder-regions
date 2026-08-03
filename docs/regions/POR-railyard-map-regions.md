# PoR — Region datasets from installed maps (`.railyard_map/regions`)

**Status:** Draft / accepted direction · **Date:** 2026-08-04 · **Repos:** `subwaybuilder-regions`, `subwaybuilder-jp-data` (app-side unchanged)

## 1. Motivation

Today the regions mod discovers datasets by *static recognition*: a hardcoded
`STATIC_CUSTOM_CITY_COUNTRY_MAPPING` (city→country) + `COUNTRY_DATASET_ORDER`
(country→expected datasets) probing the mod's own `data/<CITY>/…` directory,
plus an optional local served index (`127.0.0.1:8088/data_index.json`). Players
of offline-only maps must manually download and unzip per-city bundles.

We move discovery to **on-disk scanning of an installed map's `.railyard_map/regions/`
folder**, which the game already extracts verbatim from the map ZIP. Benefits:

- No hardcoded supported-city list in the mod.
- Third-party map creators can ship regions-compliant datasets in their own maps.
- Offline-map players get regions with **no manual zip extraction**.

Online-source countries (US/CA/GB/FR/AU) are **out of scope** and keep the runtime
fetch path — those maps are not ours to repackage, and the online path guarantees
they keep working even if a creator never authors bespoke regions files.

## 2. Locked decisions

| # | Decision |
|---|----------|
| Generator location | Stays **TypeScript, in `subwaybuilder-regions`** for now. It reads jp-data *source* (`phase_inputs/`, via `link:jp-data`) and **writes back into jp-data's `export/{CODE}/regions/`**. Porting to a standalone Python generator in jp-data is a *later* offload — file an issue. |
| Manifest scope | **Regions-owned** `.railyard_map/regions/manifest.json` enumerating all regions-compatible files. Namespaced under `regions/`; a shared top-level `.railyard_map/manifest.json` can point at it later if ever needed. |
| Discovery mechanism | `electron.scanCityDataFiles(cityCode)` returns **only `basePath`** (no file listing) — so the **manifest is mandatory**; the mod reads `basePath/.railyard_map/regions/manifest.json`, never a directory scan. |
| Map scope | **Offline maps only** (`existsOnlineSource: false`: JP, EE, UA, LV, LT, TW, CZ, PL, PE, CN — plus future HU/SK/…). Our work wires up the **jp-data-sourced** subset (JP/EE/UA/LV/LT/TW/CZ/PL + future); collaborators (PE/CN) append their own conformant files. |
| Authority | `.railyard_map/regions` is **authoritative**. A city that self-declares **skips static recognition** entirely (no double-listing). Static recognition is deprecated once *all* jp-data maps are republished with regions files. |
| Catalog | `catalog.ts` (`COUNTRY_DATASET_ORDER`, display metadata) survives as **default/fallback keyed by datasetId**, overridable per-map by the manifest. Two maps declaring different orders is acceptable — creator's discretion. |
| Schema home | The versioned Zod → JSON-Schema contract is **published from THIS repo**, mirroring how `@subway-builder-modded/special-demand-schemas` is packaged. **NOT** The-Railyard — the registry is generic to all mods and must not privilege this mod. |
| Download-size cost | Accepted. Region bundles are small next to the hundreds-of-MB map files. |

## 3. Target data flow

```
jp-data source (phase_inputs/chocho_selected.geojson, neighborhood7, pop_total, …)
        │
        │  [regions] TS generator (extract:map-features + new railyard-map emit)
        ▼
jp-data/export/{CODE}/regions/            ← manifest.json + <datasetId>.geojson.gz
        │
        │  [jp-data] prepare_releases.py::_write_release_zip  (generic: glob regions/)
        ▼
releases/{CODE}.zip  →  .railyard_map/regions/{manifest.json, *.geojson.gz}
        │
        │  game installs/extracts map → basePath/.railyard_map/regions/…
        ▼
[regions] runtime: basePath = electron.scanCityDataFiles(code).basePath
          → read+validate .railyard_map/regions/manifest.json
          → register datasets @ basePath/.railyard_map/regions/<file>   (authoritative)
```

jp-data's preservation step stays **dumb and generic**: "if `export/{CODE}/regions/`
exists, copy it into `.railyard_map/regions/`." Any collaborator who drops conformant
files there gets them packaged — no jp-data code change per country.

## 4. The contract (defined in PR 1)

**Layout inside a map:** `.railyard_map/regions/`
- `manifest.json` — required; the discovery entry point.
- `<datasetId>.geojson.gz` — one per declared dataset.

**`manifest.json`** (near-superset of today's `data_index.json` per-city value; `schemaVersion` from day one):

```jsonc
{
  "schemaVersion": 1,
  "cityCode": "TYO",
  "country": "JP",
  "datasets": [
    {
      "datasetId": "shichouson",
      "displayName": "Municipalities",
      "unitSingular": "municipality",
      "unitPlural": "municipalities",
      "source": "MLIT / e-Stat",
      "file": "shichouson.geojson.gz",
      "featureCount": 62,
      "fileSizeMB": 1.2,
      "order": 0            // optional per-map override of catalog order
    }
    // …
  ]
}
```

**Feature-property contract** (per geojson feature — finalized in PR 1 by reading
the extractor + reader): stable unit id, display name, population, area. Documented
so third parties can author conformant datasets without reading our source.

## 5. PR sequence

Dependency order: **PR 1 → (PR 2 ∥ PR 4) → PR 3 → PR 5**. PR 4 can develop against a
hand-authored sample map while PR 2/3 mature.

### PR 1 — `regions`: publish the versioned schema package  *(foundation)*
- New Zod source in this repo for (a) `.railyard_map/regions/manifest.json` and
  (b) the geojson feature-property contract, both carrying `schemaVersion`.
- Emit JSON Schema + publish an npm package, mirroring the special-demand-schemas
  setup (exact packaging mechanics pinned here by inspecting that package).
- No runtime behavior change yet. This is the contract PR 2 and PR 4 both import.

### PR 2 — `regions`: generator emits `.railyard_map/regions/` + writeback
- Extend the existing extractor/export (`extract-map-features.ts`,
  `export-data-archives.ts`, `scripts/regions/*`) to emit the PR-1-shaped
  `manifest.json` + `<datasetId>.geojson.gz` into **jp-data's `export/{CODE}/regions/`**
  (configurable jp-data path; the accepted "write back into jp-data" coupling).
- Validate emitted output against the PR-1 schema before writing.
- Covers the jp-data-sourced offline countries (JP/EE/UA/LV/LT/TW/CZ/PL + future).

### PR 3 — `jp-data`: preserve regions files into `.railyard_map`  *(trivial)*
- Extend `prepare_releases.py::_write_release_zip` (existing `.railyard_map/` block,
  ~L477–499) to fold `export/{CODE}/regions/*` → `.railyard_map/regions/*`.
- Generic glob — no per-country logic; collaborator drop-ins are packaged for free.

### PR 4 — `regions`: runtime `.railyard_map` discovery source  *(the consumer)*
- New registry source: per loaded city, `basePath = scanCityDataFiles(code).basePath`,
  read+validate `basePath/.railyard_map/regions/manifest.json`, register datasets at
  `basePath/.railyard_map/regions/<file>` (fetch mirrors current `file://`/`loadCityData`).
- Make it **authoritative**: a self-declaring city skips static recognition.
- Catalog becomes fallback/override for display metadata.
- Friendly load-time errors on malformed/absent manifest (notification, not crash).
- **README update** documenting the on-disk format so creators can author maps.

### PR 5 — `regions`: deprecate static recognition  *(gated on full republish)*
- After all jp-data maps ship regions files: retire `STATIC_CUSTOM_CITY_COUNTRY_MAPPING`,
  `STATIC_TEMPLATES`/`resolveStaticTemplateCountry`, the served-index local server
  (`DEFAULT_PORT`/`DATA_INDEX_FILE`/`SERVE_URL`), and the offline-country Fetch UI
  (`fetch-datasets.ts`, `fetch.ps1/.sh`, fetch-cli).
- **Keep** the online-fetch path for US/CA/GB/FR/AU.

## 6. Follow-up issues (file, do not execute now)

- **jp-data #: port the regions generator to Python.** Move `scripts/extract/*` logic
  into a standalone jp-data generator (modeled on `generate_preview_image.py`,
  iterating `load_bundle_index`), removing the regions→jp-data writeback coupling and
  fully offloading the jp-data dependency from regions.

## 7. Deprecation ledger (regions)

Retired in **PR 5** once republish is complete:
`core/registry/static.ts` (city-code arrays, `STATIC_CUSTOM_CITY_COUNTRY_MAPPING`,
`STATIC_TEMPLATES`, `resolveStaticTemplateCountry`) · `catalog.ts`
`CATALOG_STATIC_COUNTRIES`/`existsOnlineSource` (offline half) · served-index wiring in
`constants.ts` + `app/main.ts` · Fetch UI (`fetch-datasets.ts`, `fetch-helpers.ts`,
`fetch.ps1/.sh`, fetch-cli). `DATASET_METADATA_CATALOG` survives as display fallback.
