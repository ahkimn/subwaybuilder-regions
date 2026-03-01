# Testing Tasks Roadmap (A–E)

This roadmap captures the next incremental unit-test work agreed for this repository.

## Revalidation Notes

- This roadmap was revalidated against the current repository snapshot where tests are located under `test/` (not `testsrc/`).
- A–E remain applicable and are still the recommended incremental sequence.


## A) Expand Geometry Helper Coverage (`src/core/geometry/helpers.ts`)

- [ ] Add table-driven tests for `normalizeBBox`:
  - [ ] already-large bbox remains unchanged
  - [ ] small bbox expands symmetrically to minimum spans
- [ ] Add tests for `buildBBoxFitState`:
  - [ ] min-padding clamp path
  - [ ] max-padding clamp path
- [ ] Add tests for `segmentBBox` and `getArcBBox`:
  - [ ] mixed coordinates
  - [ ] single coordinate fallback path
- [ ] Add tests for coordinate validation and bbox construction:
  - [ ] `isValidCoordinate` finite/range boundaries
  - [ ] `polygonBBox` and `multiPolyBBox` with valid + invalid points
- [ ] Add tests for bbox padding:
  - [ ] `padBBoxKm` with positive and negative input padding
  - [ ] clamping near world latitude/longitude limits
- [ ] Add tests for `buildPaddedBBoxForDemandData` null and non-null flow

## B) Add Arc-Length Coverage (`src/core/geometry/arc-length.ts`)

- [ ] Add tests for `prepareBoundaryParams` with Polygon and MultiPolygon
- [ ] Add tests for `planarArcLengthInsideBoundary`:
  - [ ] no intersection => zero
  - [ ] partial intersection with unknown knownLength
  - [ ] scaling path when `knownLength` provided
- [ ] Add tests for `geodesicArcLengthInsideBoundary`:
  - [ ] bbox fast reject path
  - [ ] full-within path
  - [ ] split-segment accumulation path

## C) Add Fetch CLI Parse/Validation Coverage (`scripts/fetch/*`)

- [ ] Add tests for `parseFetchArgs`:
  - [ ] supports both `--west=-74.0` and `--west -74.0`
  - [ ] trims/splits datasets
  - [ ] uppercases `cityCode`/`countryCode`
  - [ ] default `compress`/`out`
  - [ ] exits on missing bbox args
- [ ] Add tests for `validateFetchRequest`:
  - [ ] empty dataset list throws
  - [ ] unsupported dataset list throws with allowed values
  - [ ] valid country/dataset combinations pass

## D) Add HTTP Retry/Timeout Coverage (`scripts/utils/http.ts`)

- [ ] Add tests with mocked `global.fetch` for:
  - [ ] immediate JSON success
  - [ ] transient retries (429/5xx) then success
  - [ ] non-transient failure (4xx) without retry looping
  - [ ] non-JSON response with body preview error
  - [ ] network `TypeError` retry path
  - [ ] abort/timeout retry path

## E) Add Storage I/O Coverage (`src/core/storage/helpers.ts`)

- [ ] Add tests for `tryDatasetPath`:
  - [ ] present path (`response.ok=true`)
  - [ ] missing path (`response.ok=false`)
  - [ ] fetch rejection path
- [ ] Add tests for `tryLocalDatasetPaths`:
  - [ ] selects first present candidate
  - [ ] falls back to first candidate with `isPresent=false`
- [ ] Add tests for `getFeatureCountForLocalDataset`:
  - [ ] valid feature collection count
  - [ ] invalid JSON returns null
  - [ ] missing features array returns null

---

## Testing Pattern Improvements (applied now)

- [x] Add shared test harness utilities under `test/helpers`
- [x] Keep descriptive `..._should..._when...` test names and add Given/When/Then comments for multi-step tests
- [x] Introduce table-driven style for simple branch matrices
- [x] Clarify test tree split:
  - [x] `test/core/**` for pure and core-focused tests
  - [x] `test/scripts/**` reserved for script/CLI/network utility tests
