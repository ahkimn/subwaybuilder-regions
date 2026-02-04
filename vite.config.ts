import { UserConfig } from 'vite';
import { resolve } from 'path';

const sourceDirectory = resolve(__dirname, 'src');

export default {
  build: {
    lib: {
      entry: resolve(sourceDirectory, 'main.js'),
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