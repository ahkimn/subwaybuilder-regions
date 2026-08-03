# @subway-builder-modded/regions-schemas

Versioned schema contract for **SubwayBuilder Regions** datasets shipped inside a
map's `.railyard_map/regions/` folder. Lets any map creator publish region datasets
the Regions mod can discover and load on disk — no hardcoded per-city support needed.

Zod is the source of truth; JSON Schema documents (draft 2020-12) are emitted from it
into [`json-schemas/`](./json-schemas) for language-agnostic tooling.

## What a conformant map ships

```
<installed map>/.railyard_map/regions/
├── manifest.json              # discovery entry point (see manifest.schema.json)
├── <datasetId>.geojson.gz     # one per dataset declared in the manifest
└── ...
```

### `manifest.json`

A superset of the legacy `data_index.json` per-city entry, plus `file`, `order`, and a
`schemaVersion`:

```jsonc
{
  "schemaVersion": 1,
  "cityCode": "TYO", // optional; echoes the map's city code
  "country": "JP", // optional map-level country
  "datasets": [
    {
      "datasetId": "shichouson",
      "displayName": "Municipalities",
      "unitSingular": "municipality",
      "unitPlural": "municipalities",
      "source": "MLIT / e-Stat",
      "file": "shichouson.geojson.gz", // relative to .railyard_map/regions/
      "size": 62, // feature count
      "fileSizeMB": 1.2, // optional
      "order": 0, // optional; overrides catalog display order
    },
  ],
}
```

`file` must be a relative path inside the folder (no `..`, no absolute paths). That
constraint is enforced by the Zod validator; it is not expressible in JSON Schema, so
JSON-Schema-only consumers should apply it separately.

### Dataset feature contract

Each `<datasetId>.geojson.gz` is a `FeatureCollection` of `Polygon`/`MultiPolygon`
features. Required per-feature `properties`:

| Key                | Type             | Notes                                         |
| ------------------ | ---------------- | --------------------------------------------- |
| `ID`               | string \| number | stable join key (required)                    |
| `NAME`             | string           | region name (required)                        |
| `LAT` / `LNG`      | number           | label point (required)                        |
| `DISPLAY_NAME`     | string           | optional; falls back to `NAME`                |
| `TOTAL_AREA`       | number (km²)     | optional                                      |
| `AREA_WITHIN_BBOX` | number (km²)     | optional; playable-area                       |
| `POPULATION`       | number \| null   | optional                                      |
| `UNIT_TYPE`        | string           | optional per-feature unit label               |
| `NAME_NATIVE`      | string           | optional; unlocalized native name (see below) |
| `NAME_EN`          | string           | optional; romanized / Latin name              |

`NAME_NATIVE` is the region's name in its own script, unlocalized — Cyrillic for UA,
Traditional Chinese for TW, Japanese for JP, etc. It is the canonical go-forward
field; the extractor historically emitted country-specific keys (`NAME_JA` /
`NAME_ZH` / `NAME_UK`) which remain valid as passthrough.

Unknown properties are preserved, not rejected.

## Usage

```ts
import {
  validateRegionsManifest,
  validateRegionsFeatureCollection,
  RegionsManifestSchema,
  REGIONS_MANIFEST_SCHEMA_VERSION,
  RAILYARD_MAP_REGIONS_DIR,
} from '@subway-builder-modded/regions-schemas';

const result = validateRegionsManifest(JSON.parse(raw));
if (!result.success) console.error(result.errors);
```

Raw JSON Schema documents are exported too: `@subway-builder-modded/regions-schemas/json-schemas`.

## Development

```bash
npm install
npm run build              # tsc -> dist/
npm run emit-json-schemas  # regenerate json-schemas/ from Zod
npm test                   # build + node:test (includes a drift check)
```

After changing any Zod schema, re-run `npm run emit-json-schemas` and commit
`json-schemas/`; the drift test fails otherwise. Releasing: see [RELEASING.md](./RELEASING.md).
