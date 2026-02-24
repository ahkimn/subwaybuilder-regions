import type { BBox } from 'geojson';

import type { RegionDatasetRegistry } from '../../core/registry/RegionDatasetRegistry';
import type { RegionsStorage } from '../../core/storage/RegionsStorage';
import type { RegionsSettings } from '../../core/storage/types';
import type { RegionsMapLayers } from '../../map/RegionsMapLayers';
import type { ModdingAPI } from '../../types';
import type { RegionsUIManager } from '../../ui/RegionsUIManager';

// Helper type to expose private fields and methods of the Regions mod to the debug API
export type RegionsDebugContext = {
  api: ModdingAPI;
  getCurrentCityCode: () => string | null;
  getSettingsSnapshot: () => RegionsSettings;
  getRegistry: () => RegionDatasetRegistry;
  getStorage: () => RegionsStorage;
  getUIManager: () => RegionsUIManager | null;
  getMapLayers: () => RegionsMapLayers | null;
};

export type RegionsDebugApi = {
  settings: {
    print: () => void;
  };
  registry: {
    print: () => void;
  };
  cities: {
    buildPaddedBBox: (
      cityCode?: string,
      paddingKm?: number,
    ) => Promise<BBox | null>;
    exportCityBBoxes: (paddingKm?: number) => Promise<string>;
  };
  lifecycle: {
    getCurrentCityCode: () => string | null;
    tearDownUIManager: () => void;
  };
  ui: {
    getActiveSelection: () => unknown;
    logMapStyle: () => void;
    logLayerOrder: () => void;
    logVisibleLayers: () => void;
  };
};
