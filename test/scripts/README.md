# Script-Level Tests

This directory is reserved for tests targeting `scripts/**` modules.

Conventions:
- Use shared helpers from `test/helpers/runtime-test-harness.ts` for mocking:
  - `process.exit`
  - `console.*`
- Prefer table-driven test cases for argument parsing and validation matrices.
- Keep unit tests deterministic: mock network/filesystem and avoid external resources.
