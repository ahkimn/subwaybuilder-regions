import { UserConfig } from 'vite';
import { resolve } from 'path';

const sourceDirectory = resolve(__dirname, 'src');

export default {
  build: {
    lib: {
      entry: resolve(sourceDirectory, 'main.js'),
      formats: ['iife'],
      name: 'SubwayBuilderAdditionalStatistics',
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
    sourcemap: true
  }
} satisfies UserConfig;