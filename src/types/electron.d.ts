/** Subway Builder Modding API v1.0.0 */

import { ModManifest } from './manifest';

// =============================================================================
// ELECTRON IPC TYPES
// =============================================================================

export interface ElectronAPI {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  quit(): void;
  reloadWindow(): void;
  setCurrentRoute(route: string): void;
  updateDiscordActivity(activity: unknown): void;
  saveGameToFile(data: unknown): Promise<boolean>;
  saveGameAuto(data: unknown): Promise<boolean>;
  loadGameFromFile(): Promise<unknown>;
  loadGameFromPath(path: string): Promise<unknown>;
  getSaveFilesFromDirectory(): Promise<unknown[]>;
  deleteSaveFile(filename: string): Promise<boolean>;
  importMetroFile(): Promise<unknown>;
  setLicenseKey(key: string): Promise<void>;

  getModsFolder?: () => Promise<string>;
  openModsFolder?: () => Promise<void>;
  getSystemPerformanceInfo?: () => Promise<SystemPerformanceInfo>;
  scanMods: () => Promise<{ success: boolean; mods: ModStatus[] }>;

  /** Gets a value from the game's settings file metro-maker4/settings.json. */
  getStorageItem: (key: string) => Promise<{ success: boolean; data: unknown }>;
  getSetting: (key: string) => Promise<{ success: boolean; value: unknown }>;

  /** Sets a value in the game's settings file metro-maker4/settings.json. */
  setStorageItem: (
    key: string,
    value: unknown,
  ) => Promise<{ success: boolean }>;
  setSetting: (key: string, value: unknown) => Promise<{ success: boolean }>;

  /** Gets the user's current language setting (e.g. "en", "fr", "de"). */
  getLanguage(): Promise<string>;
}

export type SystemPerformanceInfo = {
  totalRAMGB: number;
  cpuCores: number;
  heapSizeMB: number;
  platform: string;
  arch: string;
};

export interface ElectronAPIExtended {
  loadDataFile(path: string): Promise<unknown>;
  getDataServerPort(): Promise<number>;
  buildBlueprints(): Promise<void>;
  findRoutePathOrder(routeId: string): Promise<unknown>;
}

export type ModStatus = ModManifest & {
  /** Absolute path to the mod's main JavaScript file. */
  path: string;
  enabled: boolean;
};
