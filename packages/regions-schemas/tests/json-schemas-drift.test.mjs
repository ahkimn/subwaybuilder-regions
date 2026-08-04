import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { buildJsonSchemaDocuments } from '../dist/index.js';
import { serializeDocument } from '../dist/emit-json-schemas.js';

// Guards against committing Zod changes without re-running `npm run emit-json-schemas`.
test('committed json-schemas match the Zod source', () => {
  const documents = buildJsonSchemaDocuments();
  for (const [filename, document] of Object.entries(documents)) {
    const committedPath = fileURLToPath(
      new URL(`../json-schemas/${filename}`, import.meta.url),
    );
    let committed;
    try {
      committed = readFileSync(committedPath, 'utf8');
    } catch {
      assert.fail(
        `missing json-schemas/${filename} — run \`npm run emit-json-schemas\``,
      );
    }
    assert.equal(
      committed,
      serializeDocument(document),
      `json-schemas/${filename} is stale — run \`npm run emit-json-schemas\``,
    );
  }
});
