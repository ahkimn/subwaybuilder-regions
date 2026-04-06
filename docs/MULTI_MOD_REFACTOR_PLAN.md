# Multi-Mod Refactor Plan

## Goal

Refactor `subwaybuilder-regions` from a single-mod repository into a monorepo that hosts a shared core library (`lib/`) and multiple independently releasable SubwayBuilder mods. The Regions mod continues releasing from this repository. New mods (starting with Enhanced Demand View) push their built artifacts to dedicated sister repositories.

---

## 1. Target Directory Structure

```
subwaybuilder-regions/                    (repo root — name unchanged)
│
├── lib/                                  ← NEW shared core library
│   ├── lifecycle/
│   │   ├── BaseMod.ts                    ← abstract mod base class
│   │   └── hooks.ts                      ← shared hook patterns (city load tokens, etc.)
│   ├── ui/
│   │   ├── elements/                     ← extracted from src/ui/elements/
│   │   │   ├── Button.ts
│   │   │   ├── Checkbox.ts
│   │   │   ├── DataTable.ts
│   │   │   ├── SelectMenu.ts
│   │   │   ├── SearchInput.ts
│   │   │   ├── InlineToggle.ts
│   │   │   ├── Label.ts
│   │   │   ├── Divider.ts
│   │   │   ├── Placeholder.ts
│   │   │   └── ... (all current ui/elements)
│   │   ├── panels/
│   │   │   └── types.ts                  ← PanelRenderer interface, SortState, SortConfig
│   │   └── observers/
│   │       └── base.ts                   ← generalized MutationObserver helpers
│   ├── types/                            ← extracted from src/types/
│   │   ├── api.d.ts
│   │   ├── core.d.ts
│   │   ├── game-state.d.ts
│   │   ├── manifest.d.ts
│   │   └── ... (all game API type definitions)
│   ├── geometry/                         ← extracted from src/core/geometry/
│   │   └── ... (bbox, distance, camera-fit helpers)
│   ├── storage/
│   │   └── base.ts                       ← generalized storage base (settings load/persist pattern)
│   ├── domain/
│   │   └── ui-state.ts                   ← base UIState class
│   └── index.ts                          ← barrel export
│
├── mods/
│   ├── regions/                          ← current src/ relocated
│   │   ├── app/
│   │   │   ├── main.ts                   ← RegionsMod extends BaseMod
│   │   │   └── debug/
│   │   ├── core/
│   │   │   ├── constants/
│   │   │   ├── datasets/                 ← RegionDataset, RegionDataManager, etc.
│   │   │   ├── domain/                   ← regions-specific domain models
│   │   │   ├── registry/                 ← RegionDatasetRegistry, cache
│   │   │   ├── storage/                  ← RegionsStorage (extends base)
│   │   │   ├── errors.ts
│   │   │   └── utils.ts
│   │   ├── map/                          ← RegionsMapLayers, styles
│   │   ├── ui/
│   │   │   ├── RegionsUIManager.ts
│   │   │   ├── CommuterRefreshLoop.ts
│   │   │   ├── panels/                   ← info/, overview/, settings/, shared/
│   │   │   ├── observers/                ← regions-specific observer configs
│   │   │   ├── resolve/
│   │   │   ├── react/
│   │   │   └── map-layers/
│   │   ├── manifest.json                 ← com.ahkimn.regions (moved from repo root)
│   │   └── vite.config.ts               ← regions Vite build config
│   │
│   └── enhanced-demand-view/              ← NEW mod
│       ├── app/
│       │   └── main.ts                   ← EnhancedDemandViewMod extends BaseMod
│       ├── core/                         ← mod-specific logic (no database/registry)
│       ├── ui/                           ← different UX, imports lib/ui/elements
│       ├── manifest.json                 ← com.ahkimn.enhanced-demand-view
│       └── vite.config.ts               ← enhanced-demand-view Vite build config
│
├── shared/                               ← UNCHANGED (dev/runtime shared constants, catalog)
├── scripts/                              ← UNCHANGED (one-off build/extraction/release scripts)
├── data/                                 ← UNCHANGED (regions GeoJSON data)
├── docs/
│   ├── CHANGELOG.md                      ← regions changelog (continues as-is)
│   ├── CHANGELOG-enhanced-demand-view.md  ← NEW: enhanced-demand-view changelog
│   ├── RELEASING.md                      ← updated for multi-mod release
│   └── ...
├── test/                                 ← expanded with per-mod test dirs
│
├── vite.base.ts                          ← NEW: shared Vite config factory
├── tsconfig.json                         ← updated path aliases
├── package.json                          ← updated scripts
├── manifest.json                         ← REMOVED (moved into mods/regions/)
└── config.example.yaml                   ← UNCHANGED
```

---

## 2. Shared Library Extraction (`lib/`)

### What moves to `lib/`

| Current Location | Destination | Rationale |
|---|---|---|
| `src/ui/elements/*` | `lib/ui/elements/` | Generic DOM primitives, no regions-specific logic |
| `src/types/*` | `lib/types/` | Game API type definitions, universal to any mod |
| `src/core/geometry/*` | `lib/geometry/` | Reusable spatial helpers |
| `src/ui/panels/types.ts` | `lib/ui/panels/types.ts` | `PanelRenderer` interface, `SortState`/`SortConfig` |
| `src/core/domain/ui-state.ts` | `lib/domain/ui-state.ts` | Base `UIState` class (mods extend) |
| Pattern from `src/app/main.ts` | `lib/lifecycle/BaseMod.ts` | Abstract mod lifecycle class (new file) |
| Pattern from `src/core/storage/` | `lib/storage/base.ts` | Generalized settings load/persist (new file) |

### What stays in `mods/regions/`

| Location | Rationale |
|---|---|
| `core/datasets/*` | Deeply coupled to region GeoJSON model |
| `core/registry/*` | Dataset registry = regions "database" |
| `core/storage/RegionsStorage.ts` | Regions-specific settings schema |
| `core/constants/*` | Regions-specific UI/map/storage constants |
| `core/domain/` (minus base UIState) | Regions-specific domain models |
| `map/*` | MapLibre layer management for regions |
| `ui/RegionsUIManager.ts` | Regions panel orchestration |
| `ui/panels/*` | All regions panel content renderers |
| `ui/observers/*` | DOM observers for regions panel injection points |

### Lifecycle Base Class

```typescript
// lib/lifecycle/BaseMod.ts
import type { ModdingAPI } from '../types/api';

export abstract class BaseMod {
  protected readonly api: ModdingAPI;

  constructor() {
    this.api = window.SubwayBuilderAPI;
  }

  /** Called once after construction to set up the mod. */
  abstract initialize(): Promise<void>;

  /** Called when a city is loaded. */
  abstract onCityLoad(cityCode: string): Promise<void>;

  /** Called when the MapLibre map instance is ready. */
  abstract onMapReady(map: maplibregl.Map): void;

  /** Called when the game session ends. */
  abstract onGameEnd(): void;

  /** Wire up SubwayBuilderAPI lifecycle hooks. */
  protected attachHooks(): void {
    this.api.on('cityLoad', (cityCode: string) => this.onCityLoad(cityCode));
    this.api.on('mapReady', (map: maplibregl.Map) => this.onMapReady(map));
    this.api.on('gameEnd', () => this.onGameEnd());
  }
}
```

> Note: The exact hook registration API (`api.on(...)` vs direct assignment) should match whatever `SubwayBuilderAPI` exposes. Adjust during implementation.

---

## 3. Build System

### Shared Vite Config Factory

```typescript
// vite.base.ts
import { resolve } from 'path';
import type { UserConfig } from 'vite';

export function createModConfig(options: {
  modDir: string;     // absolute path to mod directory
  entry: string;      // relative entry within mod dir
  globalName: string; // IIFE global name
  outDir: string;     // output directory
}): UserConfig {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@lib': resolve(__dirname, 'lib'),
        '@shared': resolve(__dirname, 'shared'),
        '@mod': options.modDir,
      },
    },
    build: {
      lib: {
        entry: resolve(options.modDir, options.entry),
        formats: ['iife'],
        name: options.globalName,
        fileName: () => 'index.js',
      },
      rollupOptions: {
        external: ['maplibre-gl'],
        output: {
          globals: { 'maplibre-gl': 'maplibregl' },
        },
      },
      outDir: options.outDir,
      sourcemap: true,
      minify: 'esbuild',
    },
  };
}
```

### Per-Mod Configs

```typescript
// mods/regions/vite.config.ts
import { resolve } from 'path';
import { createModConfig } from '../../vite.base';

export default createModConfig({
  modDir: __dirname,
  entry: 'app/main.ts',
  globalName: 'SubwayBuilderRegions',
  outDir: resolve(__dirname, '../../dist/regions'),
});
```

```typescript
// mods/enhanced-demand-view/vite.config.ts
import { resolve } from 'path';
import { createModConfig } from '../../vite.base';

export default createModConfig({
  modDir: __dirname,
  entry: 'app/main.ts',
  globalName: 'SubwayBuilderEnhancedDemandView',
  outDir: resolve(__dirname, '../../dist/enhanced-demand-view'),
});
```

### TypeScript Configuration

```jsonc
// tsconfig.json — updated paths
{
  "compilerOptions": {
    "paths": {
      "@lib/*": ["lib/*"],
      "@shared/*": ["shared/*"],
      "@regions/*": ["mods/regions/*"],
      "@enhanced-demand-view/*": ["mods/enhanced-demand-view/*"],
      "@test/*": ["test/*"]
    }
  },
  "include": ["lib", "mods", "shared", "scripts", "test"]
}
```

### Package Scripts

```jsonc
// package.json — key script updates
{
  "scripts": {
    "build": "npm run build:regions && npm run build:enhanced-demand-view",
    "build:regions": "vite build -c mods/regions/vite.config.ts",
    "build:enhanced-demand-view": "vite build -c mods/enhanced-demand-view/vite.config.ts",

    "build:main": "npm run build:regions",

    "release:regions:version": "tsx scripts/build/resolve-release-version.ts --changelog=docs/CHANGELOG.md",
    "release:regions:package": "tsx scripts/build/package-release.ts --mod=regions",

    "release:enhanced-demand-view:version": "tsx scripts/build/resolve-release-version.ts --changelog=docs/CHANGELOG-enhanced-demand-view.md",
    "release:enhanced-demand-view:package": "tsx scripts/build/package-release.ts --mod=enhanced-demand-view",

    "serve": "npm run serve:regions",
    "serve:regions": "tsx scripts/serve-data.ts",

    "link": "tsx scripts/link.ts --mod=all",
    "link:regions": "tsx scripts/link.ts --mod=regions",
    "link:enhanced-demand-view": "tsx scripts/link.ts --mod=enhanced-demand-view",

    "build:dev": "npm run build:regions && npm run link:regions && npm run dev",
    "build:dev:enhanced-demand-view": "npm run build:enhanced-demand-view && npm run link:enhanced-demand-view && npm run dev",

    "lint": "eslint lib/ mods/ scripts/ test/",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## 4. Release & Versioning

### Principles

- Each mod has its **own `manifest.json`** with its own semver `version`.
- Each mod has its **own changelog** (`docs/CHANGELOG.md` for regions, `docs/CHANGELOG-enhanced-demand-view.md` for enhanced-demand-view).
- Tags on this repository are **prefixed by mod name** to disambiguate: `regions-v0.4.8`, `enhanced-demand-view-v0.1.0`.
- Tags pushed to **sister repositories** are plain semver: `v0.1.0`.
- The version in the tag **must match** the version in that mod's `manifest.json`.

### Regions Release (from this repo)

**Trigger:** Tag `regions-v*` pushed to this repo.

**Workflow:** `.github/workflows/release-regions.yml` (renamed from `release.yml`)

```yaml
on:
  push:
    tags: ['regions-v*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci

      - name: Resolve version
        id: version
        run: |
          VERSION="${GITHUB_REF#refs/tags/regions-v}"
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"

      - name: Validate manifest version matches tag
        run: |
          MANIFEST_VER=$(node -p "require('./mods/regions/manifest.json').version")
          if [ "$MANIFEST_VER" != "${{ steps.version.outputs.version }}" ]; then
            echo "::error::Tag version (${{ steps.version.outputs.version }}) != manifest ($MANIFEST_VER)"
            exit 1
          fi

      - name: Build & package
        run: npm run release:regions:package

      - name: Extract release notes
        id: notes
        run: tsx scripts/build/extract-release-notes.ts --changelog=docs/CHANGELOG.md --version=${{ steps.version.outputs.version }}

      - name: Publish GitHub release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: regions-v${{ steps.version.outputs.version }}
          name: Regions v${{ steps.version.outputs.version }}
          body: ${{ steps.notes.outputs.notes }}
          files: |
            release/subwaybuilder-regions-v*.zip
            release/manifest.json
```

### Enhanced Demand View Release (pushes to sister repo)

**Trigger:** Tag `enhanced-demand-view-v*` pushed to this repo.

**Workflow:** `.github/workflows/release-enhanced-demand-view.yml`

```yaml
on:
  push:
    tags: ['enhanced-demand-view-v*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci

      - name: Resolve version
        id: version
        run: |
          VERSION="${GITHUB_REF#refs/tags/enhanced-demand-view-v}"
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"

      - name: Validate manifest version matches tag
        run: |
          MANIFEST_VER=$(node -p "require('./mods/enhanced-demand-view/manifest.json').version")
          if [ "$MANIFEST_VER" != "${{ steps.version.outputs.version }}" ]; then
            echo "::error::Tag version (${{ steps.version.outputs.version }}) != manifest ($MANIFEST_VER)"
            exit 1
          fi

      - name: Build
        run: npm run build:enhanced-demand-view

      - name: Checkout sister repo
        uses: actions/checkout@v4
        with:
          repository: ahkimn/subwaybuilder-enhanced-demand-view
          token: ${{ secrets.SISTER_REPO_TOKEN }}
          path: _sister

      - name: Copy artifacts to sister repo
        run: |
          cp dist/enhanced-demand-view/index.js _sister/
          cp mods/enhanced-demand-view/manifest.json _sister/

      - name: Commit, tag, and push to sister repo
        working-directory: _sister
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          git commit -m "Release v${{ steps.version.outputs.version }}"
          git tag "v${{ steps.version.outputs.version }}"
          git push origin main --tags

      - name: Create release on sister repo
        uses: softprops/action-gh-release@v2
        with:
          repository: ahkimn/subwaybuilder-enhanced-demand-view
          token: ${{ secrets.SISTER_REPO_TOKEN }}
          tag_name: v${{ steps.version.outputs.version }}
          name: v${{ steps.version.outputs.version }}
```

### Sister Repo Structure (`subwaybuilder-enhanced-demand-view`)

```
subwaybuilder-enhanced-demand-view/
├── README.md           ← minimal, points to subwaybuilder-regions for development
├── index.js            ← built artifact (pushed by CI)
└── manifest.json       ← mod manifest (pushed by CI)
```

### Release Checklist (Developer Workflow)

**Releasing Regions:**
1. Update `docs/CHANGELOG.md` with new version header
2. Update `mods/regions/manifest.json` version
3. Merge to main
4. `git tag regions-v{X.Y.Z} && git push origin regions-v{X.Y.Z}`

**Releasing Enhanced Demand View:**
1. Update `docs/CHANGELOG-enhanced-demand-view.md` with new version header
2. Update `mods/enhanced-demand-view/manifest.json` version
3. Merge to main
4. `git tag enhanced-demand-view-v{X.Y.Z} && git push origin enhanced-demand-view-v{X.Y.Z}`

---

## 5. Migration Sequence

### Step 1: Create `lib/` and extract shared code

- Create `lib/` directory structure
- Move `src/ui/elements/*` → `lib/ui/elements/`
- Move `src/types/*` → `lib/types/`
- Move `src/core/geometry/*` → `lib/geometry/`
- Extract base patterns to `lib/lifecycle/`, `lib/storage/`, `lib/domain/`
- Extract `PanelRenderer` interface and sort types to `lib/ui/panels/types.ts`
- Update all imports in `src/` to reference `@lib/`
- Verify `npm run build` still produces identical output

### Step 2: Relocate `src/` → `mods/regions/`

- Move remaining `src/` contents to `mods/regions/`
- Move root `manifest.json` → `mods/regions/manifest.json`
- Create `mods/regions/vite.config.ts` (mod-specific)
- Create `vite.base.ts` (shared config factory)
- Update `tsconfig.json` path aliases
- Update `package.json` scripts
- Update ESLint/Prettier configs for new paths
- Verify `npm run build:regions` produces identical output

### Step 3: Update dev scripts for multi-mod support

The `link`, `dev`, and `serve` scripts currently assume a single mod. They need to become mod-aware.

#### `config.yaml` changes

Replace the single `modDirName` with a per-mod map:

```yaml
gamePath: "C:\\Users\\<USER>\\...\\Subway Builder.exe"
baseModsDir: "C:\\Users\\<USER>\\AppData\\Roaming\\metro-maker4\\mods\\"

# Per-mod target directories within baseModsDir
mods:
  regions: 'regions'
  enhanced-demand-view: 'enhanced-demand-view'
```

Update `config.example.yaml` accordingly.

#### `scripts/utils/dev-config.ts` changes

```typescript
export type DevConfig = {
  gamePath: string;
  baseModsDir: string;
  mods: Record<string, string>;  // modId → modDirName
};
```

The `normalizeConfig` function validates that `mods` is a non-empty object. For backward compatibility, if the old `modDirName` key is present and `mods` is absent, auto-migrate:

```typescript
if (!rawConfig.mods && rawConfig.modDirName) {
  rawConfig.mods = { regions: rawConfig.modDirName };
}
```

#### `scripts/link.ts` → mod-aware linking

Accept `--mod=<modId>` (or `--mod=all` by default). For each mod:

- Resolve the build output path: `dist/{modId}/index.js`
- Resolve the manifest path: `mods/{modId}/manifest.json`
- Resolve the target directory: `{baseModsDir}/{mods[modId]}`
- Create symlinks for the appropriate files

Regions-specific files (fetch.ps1, fetch.sh, tools/fetch-cli.cjs) are only linked for the regions mod.

```jsonc
// package.json
{
  "link": "tsx scripts/link.ts --mod=all",
  "link:regions": "tsx scripts/link.ts --mod=regions",
  "link:enhanced-demand-view": "tsx scripts/link.ts --mod=enhanced-demand-view"
}
```

#### `scripts/dev.ts` → mod-aware launch

The `dev` script currently just launches the game. It doesn't need per-mod awareness itself, but `build:dev` (which builds then launches) should accept a mod target:

```jsonc
{
  "build:dev": "npm run build:regions && npm run link:regions && npm run dev",
  "build:dev:enhanced-demand-view": "npm run build:enhanced-demand-view && npm run link:enhanced-demand-view && npm run dev"
}
```

#### `serve-data.ts` → rename to `serve:regions`

The data server serves regions GeoJSON data from `data/`. This is regions-specific. Rename the script alias:

```jsonc
{
  "serve": "npm run serve:regions",
  "serve:regions": "tsx scripts/serve-data.ts"
}
```

Keep `serve` as an alias for `serve:regions` for convenience/backward compatibility. If the enhanced-demand-view mod ever needs its own data server, a `serve:enhanced-demand-view` script can be added later.

### Step 4: Update release workflow

- Rename `.github/workflows/release.yml` → `release-regions.yml`
- Change tag trigger from `v*` → `regions-v*`
- Update paths in workflow to `mods/regions/` and `dist/regions/`
- Update `scripts/build/package-release.ts` to accept `--mod` parameter
- Test with a dry run / pre-release tag

### Step 5: Scaffold `mods/enhanced-demand-view/`

- Create mod directory structure
- Create `manifest.json` with `com.ahkimn.enhanced-demand-view` ID
- Create entry point `app/main.ts` extending `BaseMod`
- Create `vite.config.ts` using shared factory
- Verify `npm run build:enhanced-demand-view` produces valid output

### Step 6: Add sister-repo release workflow

- Create `.github/workflows/release-enhanced-demand-view.yml`
- Set up `SISTER_REPO_TOKEN` repository secret
- Initialize `subwaybuilder-enhanced-demand-view` repo with README
- Test end-to-end with a `enhanced-demand-view-v0.1.0` tag

### Step 7: Update documentation

- Update `README.md` for monorepo structure
- Update `docs/RELEASING.md` for multi-mod release process
- Create `docs/CHANGELOG-enhanced-demand-view.md`
- Update serena/memory files

### Step 8: Verify regions mod output equivalence

The refactored regions mod must produce a bundle that is functionally identical to the pre-refactor version. This step gates the merge of the refactoring work.

#### Automated comparison (preferred)

Before beginning Step 1, capture a reference build:

```bash
npm run build:main
cp dist/index.js dist/index.pre-refactor.js
```

After Step 2 (once `npm run build:regions` works), compare:

```bash
# Byte-for-byte comparison (ideal case — may differ due to path changes in sourcemap refs)
diff dist/regions/index.js dist/index.pre-refactor.js

# If paths changed, strip sourcemap comments and compare functional code
sed '/^\/\/# sourceMappingURL/d' dist/index.pre-refactor.js > /tmp/pre.js
sed '/^\/\/# sourceMappingURL/d' dist/regions/index.js > /tmp/post.js
diff /tmp/pre.js /tmp/post.js
```

If the IIFE bodies differ only in trivial ways (e.g., Vite-generated chunk hashes, import rewriting artifacts from path alias changes), that is acceptable. Structural differences (missing modules, changed exports, reordered initialization) are not.

#### Bundle size check

```bash
wc -c dist/index.pre-refactor.js dist/regions/index.js
```

A size delta of more than ~1% warrants investigation — likely a module was accidentally included or excluded.

#### Manual verification (fallback)

If the automated diff reveals cosmetic differences that are hard to reason about, perform a manual in-game test:

1. Build the refactored regions mod and link it to the game: `npm run build:regions && npm run link:regions`
2. Launch the game: `npm run dev`
3. Verify:
   - Settings panel opens and displays correctly
   - Dataset registry loads (served + local counts match expectations)
   - Map layers toggle on/off for a test city
   - Region selection opens the info panel with summary + commuter views
   - Overview panel renders with sortable/searchable table
   - Data server (`npm run serve:regions`) serves files correctly

This checklist should be run against the same city/dataset used during development to ensure no regressions.

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Import breakage during move | Run `tsc --noEmit` + build after each step; commit atomically |
| Bundle size regression | Compare `dist/index.js` size before/after step 2 |
| Regions release workflow breaks | Test step 3 with a pre-release tag before merging |
| Sister repo token permissions | Use a fine-grained PAT scoped to `subwaybuilder-enhanced-demand-view` only |
| Shared code changes break both mods | Add shared-lib-level unit tests; both mod builds run in CI on every push |

---

## 8. CI Updates

The existing CI (lint, typecheck, test) should be updated to cover the new structure:

```yaml
# .github/workflows/ci.yml
- run: npm run lint          # covers lib/, mods/, scripts/, test/
- run: npm run typecheck     # covers all via tsconfig includes
- run: npm test              # runs tests for all mods
- run: npm run build         # builds all mods
```

This ensures that changes to `lib/` are validated against all consuming mods before merge.
