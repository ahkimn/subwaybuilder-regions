# Core Module Tests

This directory is reserved for tests targeting `src/core/**` modules.

Conventions:
- Keep tests deterministic and isolated from external services.
- Prefer table-driven test cases for branch-heavy helper logic.
- Use shared helpers from `test/helpers/runtime-test-harness.ts` where mocking is needed (e.g. `fetch`, `window`, `console.*`).
- Keep descriptive names using `..._should..._when...`.
- Add short Given/When/Then comments for multi-step scenarios.
