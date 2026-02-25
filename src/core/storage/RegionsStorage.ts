import {
  type RegionsRegistryCache as RegistryCache,
  StaticRegistryCacheEntrySchema,
} from '@shared/dataset-index';
import type { BBox } from 'geojson';
import { z } from 'zod';

import type { ModdingAPI } from '../../types';
import type {
  ElectronAPI,
  SystemPerformanceInfo,
} from '../../types/electron';
import type { DemandDataFile } from '../../types/schemas';
import {
  REGIONS_REGISTRY_STORAGE_KEY,
  REGIONS_SETTINGS_STORAGE_KEY,
} from '../constants';
import { DEFAULT_MOD_FOLDER, MOD_ID } from '../constants/global';
import { buildPaddedBBoxForDemandData } from '../geometry/helpers';
import { DEFAULT_REGIONS_SETTINGS } from './settings';
import {
  clone,
  RegionsSettings,
  type RegionsSettings as RegionsSettingsValue,
  resolveSettings as resolveStoredSettings,
} from './types';

type SettingsListener = (settings: RegionsSettingsValue) => void;

// Class to manage i/o on local files for the Regions mod. Persists settings using the Electron API if available and fetches data from the local filesystem.
export class RegionsStorage {
  private settings: RegionsSettingsValue = clone(DEFAULT_REGIONS_SETTINGS);
  private initialized = false;
  private modScanAttempted = false;
  private resolvedModPath: string | null = null;
  private resolvedRelativeModPath = DEFAULT_MOD_FOLDER;
  private resolvedModVersion: string | null = null;
  private systemPerformanceInfo: SystemPerformanceInfo | null = null;
  private readonly listeners = new Set<SettingsListener>();

  constructor(
    private api: ModdingAPI,
    // TODO (Feature): Migrate all of these reads from the Electron API to the official game API / mod-specific storage when it is available
    private readonly storageKey: string = REGIONS_SETTINGS_STORAGE_KEY,
    private readonly electronApi: ElectronAPI = resolveElectronApi(),
  ) { }

  async initialize(): Promise<RegionsSettingsValue> {
    if (this.initialized) {
      return this.getSettings();
    }

    this.initialized = true;
    await this.hydrateSettings();
    await this.tryResolveModFromScan();
    await this.getSystemPerformanceInfo();
    return this.getSettings();
  }

  getSettings(): RegionsSettingsValue {
    return clone(this.settings);
  }

  getResolvedModVersion(): string | null {
    return this.resolvedModVersion;
  }

  getResolvedRelativeModPath(): string {
    return this.resolvedRelativeModPath;
  }

  getCachedSystemPerformanceInfo(): SystemPerformanceInfo | null {
    return this.systemPerformanceInfo;
  }

  listen(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- Mod Settings Management --- //
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

  // --- Registry Cache Management --- //
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

  // --- Electon Storage API --- //
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

  // --- Local Datapath Resolution --- //
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
    this.resolvedRelativeModPath = DEFAULT_MOD_FOLDER;
    console.warn(
      '[Regions] Falling back to mods folder path for Regions data root (scanMods unresolved).',
    );
    return `${modsDir}/${DEFAULT_MOD_FOLDER}/data`;
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
        console.warn('[Regions] scanMods returned an unsuccessful payload.');
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
      this.resolvedRelativeModPath = this.resolveRelativeModPath(
        this.resolvedModPath,
      );
    } catch (error) {
      console.error(
        '[Regions] Failed to resolve mod data root via scanMods.',
        error,
      );
    }
  }

  private resolveRelativeModPath(modPath: string): string {
    const pathSegments = modPath.split('/').filter((segment) => segment.length);
    return pathSegments[pathSegments.length - 1] ?? DEFAULT_MOD_FOLDER;
  }

  async fetchLocalDemandData(cityCode: string): Promise<DemandDataFile | null> {
    const candidatePaths = [
      `/data/${cityCode}/demand_data.json.gz`,
      `/data/${cityCode}/demand_data.json`,
    ];
    for (const candidatePath of candidatePaths) {
      try {
        const payload = await this.api.utils.loadCityData(candidatePath);
        if (isDemandDataFile(payload)) {
          return payload;
        }
      } catch (error) {
        // Continue trying candidate paths and return null only if all candidates fail.
        console.warn(
          `[Regions] Failed to load demand data from path ${candidatePath}:`,
          error,
        );
      }
    }
    return null;
  }

  async buildPaddedDemandBBox(
    cityCode: string,
    paddingKm: number,
  ): Promise<BBox | null> {
    const demandData = await this.fetchLocalDemandData(cityCode);
    if (!demandData) {
      return null;
    }

    return buildPaddedBBoxForDemandData(demandData, paddingKm);
  }

  async openModsFolder(): Promise<void> {
    if (!this.electronApi.openModsFolder) {
      throw new Error('[Regions] electron.openModsFolder is unavailable');
    }
    await this.electronApi.openModsFolder();
  }

  async getSystemPerformanceInfo(): Promise<SystemPerformanceInfo | null> {
    if (this.systemPerformanceInfo) {
      return this.systemPerformanceInfo;
    }

    // Overall system performance is not mod-critical as we can obtain the user's platform from the user agent as a fallback
    if (!this.electronApi.getSystemPerformanceInfo) {
      console.error('[Regions] electron.getSystemPerformanceInfo API is unavailable.');
      return this.systemPerformanceInfo;
    }

    try {
      const payload = await this.electronApi.getSystemPerformanceInfo();
      const parsed = z
        .object({
          totalRAMGB: z.number(),
          cpuCores: z.number(),
          heapSizeMB: z.number(),
          platform: z.string(),
          arch: z.string(),
        })
        .safeParse(payload);

      if (!parsed.success) {
        return null;
      }

      this.systemPerformanceInfo = parsed.data;
      return this.systemPerformanceInfo;
    } catch (error) {
      console.warn('[Regions] Failed to get system performance info.', error);
      return null;
    }
  }
}

function resolveElectronApi(): ElectronAPI {
  if (!window.electron) {
    throw new Error('[Regions] ElectronAPI is unavailable');
  }
  return window.electron as ElectronAPI;
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

function isDemandDataFile(payload: unknown): payload is DemandDataFile {
  const parsed = z
    .object({
      points: z.array(z.unknown()),
      pops: z.array(z.unknown()),
    })
    .safeParse(payload);
  return parsed.success;
}
