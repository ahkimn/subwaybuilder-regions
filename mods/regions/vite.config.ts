import { resolve } from 'path';

import { createModConfig } from '../../vite.base';

export default createModConfig({
  modDir: __dirname,
  entry: 'app/main.ts',
  globalName: 'SubwayBuilderRegions',
  outDir: resolve(__dirname, '../../dist/regions'),
  extraAliases: [
    { find: '@regions', replacement: __dirname },
  ],
});
