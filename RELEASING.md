# Releasing SubwayBuilder Regions

[Back to README](README.md)

This document describes the release flow for publishing a GitHub Release package for end users.

## Release Artifact

Each release publishes one zip asset:

- `subwaybuilder-regions-vX.Y.Z.zip`

The zip contains only:

- `manifest.json`
- `index.js` (built from `dist/index.js`)
- `fetch.ps1`
- `fetch.sh`
- `dist-tools/fetch-cli.cjs`

## Per-Release Steps

1. Update `CHANGELOG.md` with a new top entry using:
   - `## vX.Y.Z - YYYY-MM-DD`
2. Merge release-ready changes to `main`.
3. Sync local `main`:
   - `git checkout main`
   - `git pull origin main`
4. Run local checks:
   - `npm run lint`
   - `npm run build`
   - `npm run build:fetch-cli`
   - `npm run release:package`
5. Create and push release tag:
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`

## Release Workflow

On push of `v*` tag, the release workflow:

1. Resolves release version from latest `CHANGELOG.md` entry.
2. Verifies pushed tag matches that version.
3. Builds project and runs `npm run package-release`.
4. Extracts release notes from matching `CHANGELOG.md` section.
5. Publishes GitHub Release with:
   - tag/name `vX.Y.Z`
   - release zip asset
   - changelog-derived release notes

## Notes

- `package-release` updates `manifest.json` version to match the latest changelog version before packaging.
- If tag/version mismatch occurs, workflow fails by design.
