# Releasing SubwayBuilder Mods

[Back to README](../README.md)

This document describes the release flow for publishing mods from this repository.

## Version Source of Truth

Each mod's `CHANGELOG.md` is the single source of truth for versioning. On release, the `sync-versions` script reads the latest entry from the changelog and propagates it to the mod's `manifest.json` and the root `README.md` status table. You never need to manually edit `manifest.json` version numbers.

## Repository Structure

This monorepo contains multiple mods with a shared core library:

- `lib/` — Shared UI primitives, types, geometry, and lifecycle helpers
- `mods/regions/` — Regions mod (releases to this repo)
- `mods/enhanced-demand-view/` — Enhanced Demand View mod (releases to sister repo)

Each mod has its own `manifest.json`, `vite.config.ts`, and changelog under `docs/{mod}/`.

---

## Releasing Regions

### Release Artifacts

Each Regions release publishes to **this repository** under a plain semver `vX.Y.Z` tag (required by downstream consumers):

- `subwaybuilder-regions-regions-vX.Y.Z.zip`
- `manifest.json`

The zip contains: `manifest.json`, `index.js`, `fetch.ps1`, `fetch.sh`, `tools/fetch-cli.cjs`

### Per-Release Steps

1. Update `docs/regions/CHANGELOG.md` with a new top entry:
   ```
   ## vX.Y.Z - YYYY-MM-DD

   _Game version_ vA.B.C
   ```
2. Merge release-ready changes to `main`.
3. Sync local `main`:
   - `git checkout main && git pull origin main`
4. Run local checks:
   - `npm run lint`
   - `npm run build:regions`
   - `npm run release:regions:package`
5. Create and push release tag:
   - `git tag regions-vX.Y.Z`
   - `git push origin regions-vX.Y.Z`

### Release Workflow

On push of `regions-v*` tag, `.github/workflows/release-regions.yml`:

1. Runs `npm run release:regions:sync` to sync `manifest.json` and `README.md` from `CHANGELOG.md`.
2. Validates that the synced manifest version matches the tag version.
3. Builds and packages the release.
4. Extracts release notes from `docs/regions/CHANGELOG.md`.
5. Creates a plain `vX.Y.Z` tag on this repository (for downstream consumers expecting semver tags).
6. Publishes the GitHub Release under the `vX.Y.Z` tag.

### Tagging

Two tags are created per regions release:

- `regions-vX.Y.Z` — the trigger tag you push manually (prefixed, for disambiguation in the monorepo)
- `vX.Y.Z` — created automatically by the workflow (plain semver, for downstream consumers)

---

## Releasing Enhanced Demand View

### Release Artifacts

Each Enhanced Demand View release pushes artifacts to the **sister repository** [`subwaybuilder-enhanced-demand-view`](https://github.com/ahkimn/subwaybuilder-enhanced-demand-view):

- `index.js` (built artifact)
- `manifest.json`

### Per-Release Steps

1. Update `docs/enhanced-demand-view/CHANGELOG.md` with a new top entry:
   ```
   ## vX.Y.Z - YYYY-MM-DD
   ```
2. Merge release-ready changes to `main`.
3. Sync local `main`:
   - `git checkout main && git pull origin main`
4. Run local checks:
   - `npm run lint`
   - `npm run build:enhanced-demand-view`
5. Create and push release tag:
   - `git tag enhanced-demand-view-vX.Y.Z`
   - `git push origin enhanced-demand-view-vX.Y.Z`

### Release Workflow

On push of `enhanced-demand-view-v*` tag, `.github/workflows/release-enhanced-demand-view.yml`:

1. Runs `npm run release:enhanced-demand-view:sync` to sync `manifest.json` and `README.md` from `CHANGELOG.md`.
2. Validates that the synced manifest version matches the tag version.
3. Builds the enhanced-demand-view mod.
4. Checks out the sister repo `ahkimn/subwaybuilder-enhanced-demand-view`.
5. Copies built `index.js` and `manifest.json` to the sister repo.
6. Commits, tags (`vX.Y.Z`), and pushes to the sister repo.
7. Creates a GitHub Release on the sister repo.

**Prerequisite:** The `SISTER_REPO_TOKEN` secret must be configured with a fine-grained PAT scoped to `ahkimn/subwaybuilder-enhanced-demand-view`.

---

## Sync Scripts

The version sync can also be run locally:

```bash
# Sync manifest.json from changelog (no README update)
npm run release:regions:sync

# Or for enhanced-demand-view
npm run release:enhanced-demand-view:sync
```

These are automatically run as part of `npm run release:{mod}:package`.

---

## Notes

- Each mod versions independently. Trigger tags on this repo are prefixed (`regions-v*`, `enhanced-demand-view-v*`) to disambiguate.
- The regions workflow additionally creates a plain `vX.Y.Z` tag on this repo for downstream consumers.
- Tags pushed to the enhanced-demand-view sister repo are plain semver (`vX.Y.Z`).
- If the tag version doesn't match the latest changelog entry, workflows fail by design — update the changelog first.
