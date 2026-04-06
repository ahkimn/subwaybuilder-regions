# Releasing SubwayBuilder Mods

[Back to README](../README.md)

This document describes the release flow for publishing mods from this repository.

## Repository Structure

This monorepo contains multiple mods with a shared core library:

- `lib/` — Shared UI primitives, types, geometry, and lifecycle helpers
- `mods/regions/` — Regions mod (releases to this repo)
- `mods/enhanced-demand-view/` — Enhanced Demand View mod (releases to sister repo)

Each mod has its own `manifest.json`, `vite.config.ts`, and changelog.

---

## Releasing Regions

### Release Artifacts

Each Regions release publishes to **this repository**:

- `subwaybuilder-regions-vX.Y.Z.zip`
- `manifest.json`

The zip contains: `manifest.json`, `index.js`, `fetch.ps1`, `fetch.sh`, `tools/fetch-cli.cjs`

### Per-Release Steps

1. Update `docs/CHANGELOG.md` with a new top entry using:
   - `## vX.Y.Z - YYYY-MM-DD`
2. Update `mods/regions/manifest.json` version to match.
3. Merge release-ready changes to `main`.
4. Sync local `main`:
   - `git checkout main && git pull origin main`
5. Run local checks:
   - `npm run lint`
   - `npm run build:regions`
   - `npm run build:fetch-cli`
   - `npm run release:regions:package`
6. Create and push release tag:
   - `git tag regions-vX.Y.Z`
   - `git push origin regions-vX.Y.Z`

### Release Workflow

On push of `regions-v*` tag, `.github/workflows/release-regions.yml`:

1. Validates that the tag version matches `mods/regions/manifest.json` version.
2. Builds the regions mod and runs `npm run release:regions:package`.
3. Extracts release notes from `docs/CHANGELOG.md`.
4. Publishes GitHub Release on this repository with tag `regions-vX.Y.Z`.

---

## Releasing Enhanced Demand View

### Release Artifacts

Each Enhanced Demand View release pushes artifacts to the **sister repository** [`subwaybuilder-enhanced-demand-view`](https://github.com/ahkimn/subwaybuilder-enhanced-demand-view):

- `index.js` (built artifact)
- `manifest.json`

### Per-Release Steps

1. Update `docs/CHANGELOG-enhanced-demand-view.md` with a new top entry using:
   - `## vX.Y.Z - YYYY-MM-DD`
2. Update `mods/enhanced-demand-view/manifest.json` version to match.
3. Merge release-ready changes to `main`.
4. Sync local `main`:
   - `git checkout main && git pull origin main`
5. Run local checks:
   - `npm run lint`
   - `npm run build:enhanced-demand-view`
6. Create and push release tag:
   - `git tag enhanced-demand-view-vX.Y.Z`
   - `git push origin enhanced-demand-view-vX.Y.Z`

### Release Workflow

On push of `enhanced-demand-view-v*` tag, `.github/workflows/release-enhanced-demand-view.yml`:

1. Validates that the tag version matches `mods/enhanced-demand-view/manifest.json` version.
2. Builds the enhanced-demand-view mod.
3. Checks out the sister repo `ahkimn/subwaybuilder-enhanced-demand-view`.
4. Copies built `index.js` and `manifest.json` to the sister repo.
5. Commits, tags (`vX.Y.Z`), and pushes to the sister repo.
6. Creates a GitHub Release on the sister repo.

**Prerequisite:** The `SISTER_REPO_TOKEN` secret must be configured with a fine-grained PAT scoped to `ahkimn/subwaybuilder-enhanced-demand-view`.

---

## Notes

- Each mod versions independently. Tags on this repo are prefixed (`regions-v*`, `enhanced-demand-view-v*`) to disambiguate.
- Tags pushed to sister repos are plain semver (`vX.Y.Z`) matching the mod's `manifest.json` version.
- The `package-release` script updates `manifest.json` version to match the latest changelog version before packaging.
- If tag/version mismatch occurs, workflows fail by design.
