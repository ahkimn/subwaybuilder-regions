import { buildPaddedBBoxForDemandData } from '@lib/geometry/helpers';
import { ModStorage } from '@lib/storage/ModStorage';
import type { ModdingAPI } from '@lib/types';
import type { ElectronAPI, SystemPerformanceInfo } from '@lib/types/electron';
import type { DemandDataFile } from '@lib/types/schemas';
import {
  type RegionsRegistryCache as RegistryCache,
  StaticRegistryCacheEntrySchema,
} from '@regions/dataset-index';
import type { BBox } from 'geojson';
import { z } from 'zod';

import {
  REGIONS_REGISTRY_STORAGE_KEY,
  REGIONS_SETTINGS_STORAGE_KEY,
} from '../constants';
import { DEFAULT_MOD_FOLDER, MOD_ID } from '../constants/global';
import { decompressGzipResponse } from '../utils';
import { DEFAULT_REGIONS_SETTINGS } from './settings';
import {
  clone,
  RegionsSettings,
  type RegionsSettings as RegionsSettingsValue,
  resolveSettings as resolveStoredSettings,
} from './types';

/**
 * Storage class for the Regions mod.
 *
 * Extends `ModStorage<RegionsSettings>` for settings persistence and adds
 * regions-specific domain logic: registry cache, demand data fetching, mod
 * path scanning, and system performance info.
 */
export class RegionsStorage extends ModStorage<RegionsSettingsValue> {
  private modScanAttempted = false;
  private resolvedModPath: string | null = null;
  private resolvedRelativeModPath = DEFAULT_MOD_FOLDER;
  private resolvedModVersion: string | null = null;
  private systemPerformanceInfo: SystemPerformanceInfo | null = null;

  constructor(
    private api: ModdingAPI,
    storageKey: string = REGIONS_SETTINGS_STORAGE_KEY,
    electronApi?: ElectronAPI,
  ) {
    super(
      {
        storageKey,
        defaults: DEFAULT_REGIONS_SETTINGS,
        clone,
        equals: RegionsSettings.equals,
        resolveStored: resolveStoredSettings,
        logPrefix: '[Regions]',
      },
      ...(electronApi ? [electronApi] as const : []),
    );
  }

  override async initialize(): Promise<RegionsSettingsValue> {
    const settings = await super.initialize();
    await this.tryResolveModFromScan();
    await this.getSystemPerformanceInfo();
    return settings;
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
    const cityPath = (
      await this.electronApi.scanCityDataFiles(cityCode)
    ).basePath.replace(/\\/g, '/');
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
        console.warn(
          `[Regions] Failed to load demand data from path ${candidatePath}:`,
          error,
        );
      }
    }

    const urlCandidatePaths = [
      `${cityPath}/demand_data.json.gz`,
      `${cityPath}/demand_data.json`,
    ];

    for (const absolutePath of urlCandidatePaths) {
      try {
        const response = await fetch(absolutePath);
        const payload = absolutePath.endsWith('.gz')
          ? JSON.parse(await decompressGzipResponse(response, absolutePath))
          : await response.json();

        if (isDemandDataFile(payload)) {
          return payload;
        }
      } catch (error) {
        console.warn(
          `[Regions] Failed to load demand data from absolute path ${absolutePath}:`,
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

  async hasScannedCityData(cityCode: string): Promise<boolean> {
    try {
      const result = await this.electronApi.scanCityDataFiles(cityCode);
      return Boolean(result?.success);
    } catch (error) {
      console.warn(
        `[Regions] Failed to scan city data files for ${cityCode}.`,
        error,
      );
      return false;
    }
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

    if (!this.electronApi.getSystemPerformanceInfo) {
      console.error(
        '[Regions] electron.getSystemPerformanceInfo API is unavailable.',
      );
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
