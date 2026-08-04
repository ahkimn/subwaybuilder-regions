# Releasing `@subway-builder-modded/regions-schemas`

Published to **GitHub Packages** (`https://npm.pkg.github.com`) by a tag-triggered
workflow, mirroring `@subway-builder-modded/special-demand-schemas`.

1. Make the schema change under `src/` and update tests.
2. Re-emit and commit the JSON Schema documents:
   ```bash
   cd packages/regions-schemas
   npm run emit-json-schemas   # updates json-schemas/
   ```
3. Bump `version` in `packages/regions-schemas/package.json` (semver).
4. Verify locally:
   ```bash
   npm test
   npm pack --dry-run
   ```
5. Tag and push — the tag version must match `package.json`:
   ```bash
   git tag regions-schemas-v<version>
   git push origin regions-schemas-v<version>
   ```
   CI (`.github/workflows/publish-regions-schemas.yml`) verifies the tag matches the
   package version, builds, tests, and publishes.

Consumers install with the `@subway-builder-modded` scope pointed at GitHub Packages
(the repo `.npmrc` already configures this).
