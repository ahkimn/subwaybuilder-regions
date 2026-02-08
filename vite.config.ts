import { UserConfig } from 'vite';
import { resolve } from 'path';

const sourceDirectory = resolve(__dirname, 'src');

export default {
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared')
    }
  },
  build: {
    lib: {
      entry: resolve(sourceDirectory, 'app', 'main.ts'),
      formats: ['iife'],
      name: 'SubwayBuilderRegions',
      fileName: () => 'index.js'
    },
    rollupOptions: {
      external: ['maplibre-gl'],
      output: {
        globals: {
          'maplibre-gl': 'maplibregl'
        }
      }
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false
  }
} satisfies UserConfig;