# Testing Guidelines

Use this as the canonical quick-reference for writing and reviewing tests in this repository.

## 1) Test taxonomy

- **Pure unit tests** (`test/src/core/**`, `test/scripts/utils/**`): validate deterministic logic with minimal setup.
- **UI/DOM tests** (`test/src/ui/**`): verify rendering and interactions with JSDOM + Testing Library.
- **Smoke/integration tests** (`test/scripts/integration/**`): exercise end-to-end script flows and key command paths.

## 2) Test naming convention

Use the existing pattern:

- `function_shouldBehavior_whenCondition`

Examples already in the repo:

- `parseNumber_shouldReturnNumber_whenInputIsNumeric` (`test/scripts/utils/cli.test.ts`)
- `requireNumber_shouldExitWithCode1_whenValueIsMissingOrInvalidOrNotPositive` (`test/scripts/utils/cli.test.ts`)
- `mergeLocalRegistryEntries_shouldPreferDynamicOverStatic_forSameLogicalDataset` (`test/src/core/registry/cache.test.ts`)

## 3) Required setup and teardown

- **Script tests**: use `createScriptTestHarness()` from `test/helpers/script-test-harness.ts` and always restore in teardown.
  - `beforeEach`: `harness.install()`
  - `afterEach`: `harness.restore()` and reset mutated globals like `process.argv`
- **DOM tests**: install with `installDomEnvironment()` from `test/helpers/dom-environment.ts`, and always call `cleanup()` from Testing Library in `afterEach` before restoring DOM globals.

## 4) Fixture guidance

- Prefer small local fixture builders/factories over large inline object literals.
- Put reusable fixtures/helpers in `test/helpers/` (or a nearby `fixtures/` folder when tightly scoped to a test area).

## 5) Determinism rules

- Avoid wall-clock/time dependence unless explicitly controlled (e.g., fixed time inputs/mocks).
- Avoid network or filesystem side effects in unit/UI tests; keep those to dedicated integration/smoke tests.

## 6) Assertion style

- Use strict Node assert APIs (`node:assert/strict`).
- For failure paths, assert both:
  - behavior (e.g., exit code/throw path), and
  - key error output/message content.
