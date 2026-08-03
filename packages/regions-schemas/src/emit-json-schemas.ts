import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildJsonSchemaDocuments } from './json-schemas.js';

/** Serialize a JSON Schema document exactly as it is committed / drift-checked. */
export function serializeDocument(document: unknown): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

function main(): void {
  // dist/emit-json-schemas.js -> package root -> json-schemas/
  const outDir = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'json-schemas',
  );
  mkdirSync(outDir, { recursive: true });

  const documents = buildJsonSchemaDocuments();
  for (const [filename, document] of Object.entries(documents)) {
    writeFileSync(join(outDir, filename), serializeDocument(document));
  }
  console.log(
    `Emitted ${Object.keys(documents).length} JSON Schema document(s) to ${outDir}`,
  );
}

// Only emit when run directly (`node dist/emit-json-schemas.js`), not on import —
// the drift test imports serializeDocument from here and must not re-write files.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
