import type {
  ChanceInstance,
  DeckGLNamespace,
  ElectronAPI,
  ElectronAPIExtended,
  ModdingAPI,
} from './modding-api-v1';

declare global {
  interface Window {
    SubwayBuilderAPI: ModdingAPI;
    electron?: ElectronAPI;
    electronAPI?: ElectronAPIExtended;
    __subwayBuilder_storeCallbacks__?: unknown;
    Chance?: new (seed?: number | string) => ChanceInstance;
    chance?: ChanceInstance;
    Hammer?: unknown;
    deck?: DeckGLNamespace;
    luma?: unknown;
    mathgl?: unknown;
    loaders?: unknown;
  }
}

export { };
