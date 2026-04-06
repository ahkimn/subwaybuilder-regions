import { resolve } from 'path';
import type { Alias, UserConfig } from 'vite';

const ROOT_DIR = __dirname;

export function createModConfig(options: {
  modDir: string;
  entry: string;
  globalName: string;
  outDir: string;
  extraAliases?: Alias[];
}): UserConfig {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: [
        { find: '@lib', replacement: resolve(ROOT_DIR, 'lib') },
        { find: '@shared', replacement: resolve(ROOT_DIR, 'shared') },
        ...(options.extraAliases ?? []),
      ],
    },
    build: {
      lib: {
        entry: resolve(options.modDir, options.entry),
        formats: ['iife'],
        name: options.globalName,
        fileName: () => 'index.js',
      },
      rollupOptions: {
        external: ['maplibre-gl'],
        output: {
          globals: {
            'maplibre-gl': 'maplibregl',
          },
        },
      },
      outDir: options.outDir,
      sourcemap: true,
      minify: 'esbuild',
    },
  };
}
