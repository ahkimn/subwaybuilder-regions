import {
  type RegionsRegistryCache,
  StaticRegistryCacheEntrySchema,
} from '@shared/dataset-index';
import { z } from 'zod';

import type { ElectronAPI } from '../../types/modding-api-v1';
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
export class RegionsSettingsStore {
  private settings: RegionsSettingsValue = clone(DEFAULT_REGIONS_SETTINGS);
  private initialized = false;
  private readonly listeners = new Set<SettingsListener>();
  private readonly warnedMissingMethods = new Set<string>();

  constructor(
    private readonly storageKey: string = REGIONS_SETTINGS_STORAGE_KEY,
    private readonly electronApi:
      | Partial<ElectronApi>
      | undefined = resolveElectronApi(),
  ) {}

  async initialize(): Promise<RegionsSettingsValue> {
    if (this.initialized) {
      return this.get();
    }

    this.initialized = true;
    await this.hydrateSettings();
    return this.get();
  }

  get(): RegionsSettingsValue {
    return clone(this.settings);
  }

  listen(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async updateSettings(
    patch: Partial<RegionsSettingsValue>,
  ): Promise<RegionsSettingsValue> {
    const nextSettings: RegionsSettingsValue = {
      ...this.settings,
      ...patch,
    };

    if (RegionsSettings.equals(this.settings, nextSettings)) {
      return this.get();
    }

    this.settings = nextSettings;
    await this.persistToStorage();
    this.emit();
    return this.get();
  }

  async loadRegistryCache(): Promise<RegionsRegistryCache | null> {
    const storedValue = await this.readStorageItem(
      REGIONS_REGISTRY_STORAGE_KEY,
    );
    if (storedValue == null) {
      return null;
    }

    const cache = resolveStoredRegistryCachePayload(storedValue);
    if (!cache) {
      console.error(
        `[Regions] Invalid stored registry cache payload at key ${REGIONS_REGISTRY_STORAGE_KEY}; ignoring cache.`,
        storedValue,
      );
      return null;
    }
    return cache;
  }

  async saveRegistryCache(cache: RegionsRegistryCache): Promise<void> {
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

  async localFileExists(dataPath: string): Promise<boolean> {
    try {
      const response = await fetch(dataPath);
      return response.ok;
    } catch {
      return false;
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
    const snapshot = this.get();
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  private warnMissingElectronAPI(apiMethod: string): void {
    if (this.warnedMissingMethods.has(apiMethod)) {
      return;
    }
    this.warnedMissingMethods.add(apiMethod);
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

function resolveStoredRegistryCachePayload(
  storedValue: unknown,
): RegionsRegistryCache | null {
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
  if (isObjectRecord(storedValue) && 'data' in storedValue) {
    return storedValue.data;
  }
  return storedValue;
}
