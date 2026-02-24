#!/usr/bin/env node
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { build } from 'vite';

const ROOT_DIR = process.cwd();
const ENTRY_FILE = path.resolve(ROOT_DIR, 'scripts', 'fetch-city-datasets.ts');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'dist-tools');
const OUTPUT_FILE = path.resolve(OUTPUT_DIR, 'fetch-cli.cjs');
const SHEBANG = '#!/usr/bin/env node\n';

async function main(): Promise<void> {
  await build({
    configFile: false,
    ssr: {
      noExternal: true,
    },
    build: {
      outDir: OUTPUT_DIR,
      emptyOutDir: false,
      target: 'node18',
      minify: false,
      sourcemap: false,
      ssr: ENTRY_FILE,
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: 'fetch-cli.cjs',
          inlineDynamicImports: true,
        },
      },
    },
  });

  if (!existsSync(OUTPUT_FILE)) {
    throw new Error(`Missing expected output file: ${OUTPUT_FILE}`);
  }

  const content = readFileSync(OUTPUT_FILE, 'utf8');
  if (!content.startsWith(SHEBANG)) {
    writeFileSync(OUTPUT_FILE, `${SHEBANG}${content}`, 'utf8');
  }

  chmodSync(OUTPUT_FILE, 0o755);
  console.log(`[Fetch] Built runtime CLI: ${OUTPUT_FILE}`);
}

void main().catch((error) => {
  console.error('[Fetch] build:fetch-cli failed:', error);
  process.exit(1);
});
