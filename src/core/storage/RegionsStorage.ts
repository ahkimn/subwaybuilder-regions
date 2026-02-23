import {
  type RegionsRegistryCache as RegistryCache,
  StaticRegistryCacheEntrySchema,
} from '@shared/dataset-index';
import { z } from 'zod';

import type { ElectronAPI } from '../../types/electron';
import {
  REGIONS_REGISTRY_STORAGE_KEY,
  REGIONS_SETTINGS_STORAGE_KEY,
} from '../constants';
import { DEFAULT_REGIONS_SETTINGS } from './defaults';
import {
  clone,
  RegionsSettings,
  type RegionsSettings as RegionsSettingsValue,
  resolveSettings as resolveStoredSettings,
} from './types';

type ElectronApi = ElectronAPI;

export const MOD_ID = 'com.ahkimn.regions';

type SettingsListener = (settings: RegionsSettingsValue) => void;

// Class to manage user settings for the Regions mod. Persists settings using the Electron API if available
export class RegionsStorage {
  private settings: RegionsSettingsValue = clone(DEFAULT_REGIONS_SETTINGS);
  private initialized = false;
  private modScanAttempted = false;
  private resolvedModPath: string | null = null;
  private resolvedModVersion: string | null = null;
  private readonly listeners = new Set<SettingsListener>();

  constructor(
    // TODO (Feature): Migrate all of these reads from the Electron API to the official game API / mod-specific storage when it is available
    private readonly storageKey: string = REGIONS_SETTINGS_STORAGE_KEY,
    private readonly electronApi: ElectronApi = resolveElectronApi(),
  ) { }

  async initialize(): Promise<RegionsSettingsValue> {
    if (this.initialized) {
      return this.getSettings();
    }

    this.initialized = true;
    await this.hydrateSettings();
    await this.tryResolveModFromScan();
    return this.getSettings();
  }

  getSettings(): RegionsSettingsValue {
    return clone(this.settings);
  }

  getResolvedModVersion(): string | null {
    return this.resolvedModVersion;
  }

  listen(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Helper function to update mod-level settings, including storage persistence
  async updateSettings(
    update: Partial<RegionsSettingsValue>,
  ): Promise<RegionsSettingsValue> {
    const nextSettings: RegionsSettingsValue = {
      ...this.settings,
      ...update,
    };

    if (RegionsSettings.equals(this.settings, nextSettings)) {
      return this.getSettings();
    }

    this.settings = nextSettings;
    await this.persistToStorage();
    this.emit();
    return this.getSettings();
  }

  async loadStoredRegistry(): Promise<RegistryCache | null> {
    const stored = await this.readStorageItem(REGIONS_REGISTRY_STORAGE_KEY);
    if (stored == null) {
      return null;
    }

    const cache = resolvedStoredRegistry(stored);
    if (!cache) {
      console.error(
        `[Regions] Invalid stored registry cache payload at key ${REGIONS_REGISTRY_STORAGE_KEY}; ignoring cache.`,
        stored,
      );
      return null;
    }
    return cache;
  }

  async saveRegistry(cache: RegistryCache): Promise<void> {
    await this.writeStorageItem(REGIONS_REGISTRY_STORAGE_KEY, cache);
  }

  async resolveLocalModsDataRoot(): Promise<string> {
    await this.tryResolveModFromScan();
    if (this.resolvedModPath) {
      const modRoot = this.resolvedModPath.replace(/\/+$/, '');
      console.info(
        `[Regions] Resolved local Regions mod data root from scanMods: ${modRoot}/data`,
      );
      return `${modRoot}/data`;
    }

    if (!this.electronApi?.getModsFolder) {
      throw new Error(
        '[Regions] Missing both electron.scanMods and electron.getModsFolder APIs',
      );
    }

    const modsDir = (await this.electronApi.getModsFolder()).replace(
      /\\/g,
      '/',
    );
    console.warn(
      '[Regions] Falling back to mods folder path for Regions data root (scanMods unresolved).',
    );
    // TODO: Let the user configure this path in case they wish to save the mod in a different folder (currently this is a brittle contract)
    return `${modsDir}/regions/data`;
  }

  private async tryResolveModFromScan(): Promise<void> {
    if (this.modScanAttempted || this.resolvedModPath) {
      return;
    }

    this.modScanAttempted = true;

    // Attempt to more robustly ascertain the mod's local path and version via the scanMods API (rather than assuming a strict relative path from the game's mod directory)
    try {
      const result = await this.electronApi.scanMods();
      if (!result?.success || !Array.isArray(result.mods)) {
        console.warn(
          '[Regions] scanMods returned an unsuccessful payload.',
        );
        return;
      }

      const regionsMod = result.mods.find((mod) => mod.id === MOD_ID);
      if (!regionsMod?.path) {
        console.error(
          `[Regions] scanMods did not return an entry for mod id ${MOD_ID}.`,
        );
        return;
      }

      this.resolvedModPath = regionsMod.path.replace(/\\/g, '/');
      this.resolvedModVersion =
        typeof regionsMod.version === 'string' ? regionsMod.version : null;
    } catch (error) {
      console.error('[Regions] Failed to resolve mod data root via scanMods.', error);
    }
  }

  private async hydrateSettings(): Promise<void> {
    const storedValue = await this.readStorageItem(this.storageKey);
    if (storedValue == null) {
      return;
    }

    try {
      const stored = resolveStoredSettingsPayload(storedValue);
      if (stored === null) {
        console.error(
          `[Regions] Invalid stored settings payload at key ${this.storageKey}; falling back to defaults.`,
          storedValue,
        );
        return;
      }

      this.settings = { ...this.settings, ...stored };
    } catch (error) {
      console.error('[Regions] Failed to load settings from storage.', error);
    }
  }

  // TODO (Game Bug) replace with API storage if possible, as the base Electron storage is game-level and saves to a shared settings.json used by the game
  private async persistToStorage(): Promise<void> {
    await this.writeStorageItem(this.storageKey, this.settings);
  }

  private async readStorageItem(key: string): Promise<unknown | null> {
    try {
      const result = await this.electronApi.getStorageItem(key);
      if (!result.success) {
        console.error(`[Regions] Failed to load storage key ${key}.`);
        return null;
      }
      return result.data;
    } catch (error) {
      console.error(`[Regions] Failed to load storage key ${key}.`, error);
      return null;
    }
  }

  private async writeStorageItem(key: string, value: unknown): Promise<void> {
    try {
      const result = await this.electronApi.setStorageItem(key, value);
      if (!result.success) {
        console.error(`[Regions] Failed to persist storage key ${key}.`);
      }
    } catch (error) {
      console.error(`[Regions] Failed to persist storage key ${key}.`, error);
    }
  }

  private emit(): void {
    const snapshot = this.getSettings();
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }
}

function resolveElectronApi(): ElectronApi {
  if (!window.electron) {
    throw new Error('[Regions] ElectronAPI is unavailable');
  }
  return window.electron as ElectronApi;
}

function resolveStoredSettingsPayload(
  storedValue: unknown,
): Partial<RegionsSettingsValue> | null {
  return resolveStoredSettings(storedValue);
}

function resolvedStoredRegistry(storedValue: unknown): RegistryCache | null {
  const parsedCache = z
    .object({
      updatedAt: z.number(),
      entries: z.array(z.unknown()),
    })
    .safeParse(storedValue);

  if (!parsedCache.success) {
    return null;
  }

  const validEntries = parsedCache.data.entries.flatMap((entry) => {
    const parsedEntry = StaticRegistryCacheEntrySchema.safeParse(entry);
    return parsedEntry.success ? [parsedEntry.data] : [];
  });

  if (validEntries.length !== parsedCache.data.entries.length) {
    console.warn(
      `[Regions] Ignoring malformed entries in ${REGIONS_REGISTRY_STORAGE_KEY}`,
    );
  }

  return {
    updatedAt: parsedCache.data.updatedAt,
    entries: validEntries,
  };
}
