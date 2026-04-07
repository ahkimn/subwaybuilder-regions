import { resolve } from 'path';

import { createModConfig } from '../../vite.base';

export default createModConfig({
  modDir: __dirname,
  entry: 'app/main.ts',
  globalName: 'SubwayBuilderEnhancedDemandView',
  outDir: resolve(__dirname, '../../dist/enhanced-demand-view'),
  extraAliases: [
    { find: '@enhanced-demand-view', replacement: __dirname },
  ],
});
