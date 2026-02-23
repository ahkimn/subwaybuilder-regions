import { resolve } from 'path';
import type { UserConfig } from 'vite';

const sourceDirectory = resolve(__dirname, 'src');

export default {
  define: {
    // react-dom attempts to check process.env.NODE_ENV
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'shared'),
    },
  },
  build: {
    lib: {
      entry: resolve(sourceDirectory, 'app', 'main.ts'),
      formats: ['iife'],
      name: 'SubwayBuilderRegions',
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
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
  },
} satisfies UserConfig;
