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
import { isObjectRecord } from '../utils';
import { DEFAULT_REGIONS_SETTINGS } from './defaults';
import {
  clone,
  RegionsSettings,
  type RegionsSettings as RegionsSettingsValue,
  resolveSettings as resolveStoredSettings,
} from './types';

type ElectronApi = Pick<
  ElectronAPI,
  'getModsFolder' | 'getStorageItem' | 'setStorageItem'
>;

type SettingsListener = (settings: RegionsSettingsValue) => void;

// Class to manage user settings for the Regions mod. Persists settings using the Electron API if available
export class RegionsStorage {
  private settings: RegionsSettingsValue = clone(DEFAULT_REGIONS_SETTINGS);
  private initialized = false;
  private readonly listeners = new Set<SettingsListener>();
  // Store missing Electron API methods to avoid spamming the console with repeated warnings about the same method being unavailable
  private readonly missingMethods = new Set<string>();

  constructor(
    // TODO (Feature): Migrate all of these reads from the Electron API to the official game API / mod-specific storage when it is available
    private readonly storageKey: string = REGIONS_SETTINGS_STORAGE_KEY,
    private readonly electronApi:
      | Partial<ElectronApi>
      | undefined = resolveElectronApi(),
  ) { }

  async initialize(): Promise<RegionsSettingsValue> {
    if (this.initialized) {
      return this.getSettings();
    }

    this.initialized = true;
    await this.hydrateSettings();
    return this.getSettings();
  }

  getSettings(): RegionsSettingsValue {
    return clone(this.settings);
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
    if (!this.electronApi?.getModsFolder) {
      throw new Error('[Regions] Missing electron.getModsFolder API');
    }

    const modsDir = (await this.electronApi.getModsFolder()).replace(
      /\\/g,
      '/',
    );
    // TODO: Let the user configure this path in case they wish to save the mod in a different folder (currently this is a brittle contract)
    return `${modsDir}/regions/data`;
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
    if (!this.electronApi?.getStorageItem) {
      this.warnMissingElectronAPI('getStorageItem');
      return null;
    }

    try {
      return await this.electronApi.getStorageItem(key);
    } catch (error) {
      console.error(`[Regions] Failed to load storage key ${key}.`, error);
      return null;
    }
  }

  private async writeStorageItem(key: string, value: unknown): Promise<void> {
    if (!this.electronApi?.setStorageItem) {
      this.warnMissingElectronAPI('setStorageItem');
      return;
    }

    try {
      await this.electronApi.setStorageItem(key, value);
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

  private warnMissingElectronAPI(apiMethod: string): void {
    if (this.missingMethods.has(apiMethod)) {
      return;
    }
    this.missingMethods.add(apiMethod);
    console.warn(`[Regions] electron.${apiMethod} is unavailable`);
  }
}

function resolveElectronApi(): Partial<ElectronApi> | undefined {
  const electron = window.electron as Partial<ElectronAPI> | undefined;

  if (!electron) {
    return undefined;
  }

  return {
    getModsFolder: electron?.getModsFolder,
    getStorageItem: electron?.getStorageItem,
    setStorageItem: electron?.setStorageItem,
  };
}

function resolveStoredSettingsPayload(
  storedValue: unknown,
): Partial<RegionsSettingsValue> | null {
  return resolveStoredSettings(resolveStoragePayload(storedValue));
}

function resolvedStoredRegistry(storedValue: unknown): RegistryCache | null {
  const payload = resolveStoragePayload(storedValue);
  const cacheEnvelope = z
    .object({
      updatedAt: z.number(),
      entries: z.array(z.unknown()),
    })
    .safeParse(payload);

  if (!cacheEnvelope.success) {
    return null;
  }

  const validEntries = cacheEnvelope.data.entries.flatMap((entry) => {
    const parsedEntry = StaticRegistryCacheEntrySchema.safeParse(entry);
    return parsedEntry.success ? [parsedEntry.data] : [];
  });

  if (validEntries.length !== cacheEnvelope.data.entries.length) {
    console.warn(
      `[Regions] Ignoring malformed entries in ${REGIONS_REGISTRY_STORAGE_KEY}`,
    );
  }

  return {
    updatedAt: cacheEnvelope.data.updatedAt,
    entries: validEntries,
  };
}

function resolveStoragePayload(storedValue: unknown): unknown {
  // Storage format from Electron generally appears to be { success: boolean, data: value }
  if (isObjectRecord(storedValue) && 'data' in storedValue) {
    return storedValue.data;
  }
  return storedValue;
}
