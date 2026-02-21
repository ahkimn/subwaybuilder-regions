import type { DatasetIndex, DatasetMetadata } from '@shared/dataset-index';

import type { ModdingAPI } from '../../types/modding-api-v1';
import { REGIONS_REGISTRY_STORAGE_KEY } from '../constants';
import { RegionDataset } from '../datasets/RegionDataset';
import {
  RegistryMissingDatasetError,
  RegistryMissingIndexError,
} from '../errors';
import {
  buildLocalDatasetUrl,
  datasetFileExists,
  resolveLocalModsDataRoot,
} from './fetch-local';
import { STATIC_TEMPLATES } from './static';

type ElectronStorageApi = {
  getStorageItem?: (key: string) => Promise<unknown>;
  setStorageItem?: (key: string, value: unknown) => Promise<void>;
};

type StaticRegistryCacheEntry = {
  cityCode: string;
  datasetId: string;
  displayName: string;
  unitSingular: string;
  unitPlural: string;
  source: string;
  dataPath: string;
};

export class RegionDatasetRegistry {
  readonly datasets: Map<string, RegionDataset>;

  constructor(
    private api: ModdingAPI,
    private indexFile: string,
    private serveUrl: string,
    private readonly storageKey: string = REGIONS_REGISTRY_STORAGE_KEY,
    private readonly electronApi: ElectronStorageApi | undefined = window
      .electron as ElectronStorageApi | undefined,
  ) {
    this.datasets = new Map<string, RegionDataset>();
  }

  // -- Dataset Setters -- //
  registerDataset(dataset: RegionDataset): void {
    this.datasets.set(RegionDataset.getIdentifier(dataset), dataset);
  }

  // -- Dataset Getters -- //
  getCityDatasets(cityCode: string): RegionDataset[] {
    return Array.from(this.datasets.values()).filter(
      (dataset) => dataset.cityCode === cityCode,
    );
  }

  getCityDatasetIds(cityCode: string): string[] {
    return this.getCityDatasets(cityCode).map((dataset) =>
      RegionDataset.getIdentifier(dataset),
    );
  }

  getDatasetByIdentifier(identifier: string): RegionDataset {
    const dataset = this.datasets.get(identifier) || null;
    if (!dataset) {
      throw new RegistryMissingDatasetError(identifier);
    }
    return dataset;
  }

  getDatasetDisplayNameByIdentifier(identifier: string): string {
    return this.getDatasetByIdentifier(identifier).displayName;
  }

  // -- Dataset Mutations -- //
  async loadCityDatasets(cityCode: string, onComplete: () => void) {
    const datasets = this.getCityDatasets(cityCode);
    await Promise.all(datasets.map((dataset) => dataset.load()));
    onComplete();
  }

  // -- Setup -- //
  private assertDatasetIndexEntry(
    cityCode: string,
    entry: DatasetMetadata,
  ): void {
    if (
      !entry ||
      typeof entry.datasetId !== 'string' ||
      typeof entry.displayName !== 'string' ||
      typeof entry.unitSingular !== 'string' ||
      typeof entry.unitPlural !== 'string' ||
      typeof entry.source !== 'string' ||
      typeof entry.size !== 'number'
    ) {
      throw new Error(
        `[Regions] Invalid dataset index entry for city ${cityCode}: ${JSON.stringify(entry)}`,
      );
    }
  }

  private registerStaticDataset(
    cityCode: string,
    entry: DatasetMetadata,
    dataPath: string,
    options?: { skipValidation?: boolean },
  ): void {
    if (!options?.skipValidation) {
      this.assertDatasetIndexEntry(cityCode, entry);
    }
    this.registerDataset(
      new RegionDataset(entry, cityCode, {
        type: 'static',
        dataPath,
        writable: false,
      }),
    );
  }

  private buildFromIndex(index: DatasetIndex): number {
    let registeredDatasets = 0;
    for (const [cityCode, datasets] of Object.entries(index)) {
      for (const record of datasets) {
        this.registerStaticDataset(
          cityCode,
          record,
          `${this.serveUrl}/${cityCode}/${record.datasetId}.geojson`,
        );
        registeredDatasets += 1;
      }
    }
    return registeredDatasets;
  }

  async build(onFetchError: () => void) {
    this.clear();

    // Expected format of data_index.json is { [cityCode: string]: DatasetIndexEntry[] }.
    let index: DatasetIndex;
    try {
      const indexResponse = await fetch(`${this.serveUrl}/${this.indexFile}`);
      if (!indexResponse.ok) {
        throw new RegistryMissingIndexError(this.indexFile, this.serveUrl);
      }

      index = (await indexResponse.json()) as DatasetIndex;
    } catch {
      onFetchError();
      throw new RegistryMissingIndexError(this.indexFile, this.serveUrl);
    }

    const registered = this.buildFromIndex(index);
    if (registered === 0) {
      throw new Error('[Regions] Empty dataset index');
    }
  }

  clear(): void {
    this.datasets.clear();
  }

  // -- Debugging -- //
  printIndex(): void {
    console.log('Registered Region Datasets:');
    for (const [key, dataset] of this.datasets.entries()) {
      console.log(
        ` - ${key} (status: ${dataset.status}, writable: ${dataset.isWritable})`,
      );
    }
  }

  // -- Static Fallback Helpers -- //

  // TODO: (Feature) Add support for dynamic registry updates and remove hard-coded static index
  async buildStatic(): Promise<void> {
    this.clear();

    const cachedEntries = await this.loadStaticRegistryCache();
    if (cachedEntries && cachedEntries.length > 0) {
      for (const entry of cachedEntries) {
        this.registerStaticDataset(
          entry.cityCode,
          this.buildDatasetEntryFromCachedEntry(entry),
          entry.dataPath,
          { skipValidation: true },
        );
      }
      return;
    }

    const discoveredEntries = await this.discoverStaticLocalDatasets();
    await this.persistStaticRegistryCache(discoveredEntries);

    for (const entry of discoveredEntries) {
      this.registerStaticDataset(
        entry.cityCode,
        this.buildDatasetEntryFromCachedEntry(entry),
        entry.dataPath,
        { skipValidation: true },
      );
    }

    const registered = discoveredEntries.length;
    if (registered === 0) {
      throw new Error('[Regions] No local datasets found in static mapping');
    }
  }

  async refreshStaticRegistryCache(): Promise<number> {
    const discoveredEntries = await this.discoverStaticLocalDatasets();
    await this.persistStaticRegistryCache(discoveredEntries);
    return discoveredEntries.length;
  }

  private async discoverStaticLocalDatasets(): Promise<StaticRegistryCacheEntry[]> {
    const localModsDataRoot = await resolveLocalModsDataRoot();
    const discoveredEntries: StaticRegistryCacheEntry[] = [];

    const currentCities = this.api.utils.getCities();

    for (const city of currentCities) {
      const datasetTemplates = city.country ? STATIC_TEMPLATES.get(city.country) ?? [] : [];
      for (const template of datasetTemplates) {
        const dataPath = buildLocalDatasetUrl(
          localModsDataRoot,
          city.code,
          template.datasetId,
        );

        const exists = await datasetFileExists(dataPath);
        if (!exists) {
          continue;
        }

        discoveredEntries.push({
          cityCode: city.code,
          datasetId: template.datasetId,
          displayName: template.displayName,
          unitSingular: template.unitSingular,
          unitPlural: template.unitPlural,
          source: template.source,
          dataPath,
        });
      }
    }

    return discoveredEntries;
  }

  private buildDatasetEntryFromCachedEntry(
    entry: StaticRegistryCacheEntry,
  ): DatasetMetadata {
    return {
      datasetId: entry.datasetId,
      displayName: entry.displayName,
      unitSingular: entry.unitSingular,
      unitPlural: entry.unitPlural,
      source: entry.source,
      size: 0,
    };
  }

  private async loadStaticRegistryCache(): Promise<StaticRegistryCacheEntry[] | null> {
    if (!this.electronApi?.getStorageItem) {
      return null;
    }

    try {
      const storedValue = await this.electronApi.getStorageItem(this.storageKey);
      const payload = resolveStoragePayload(storedValue);
      if (!Array.isArray(payload)) {
        return null;
      }

      const entries = payload.filter(isStaticRegistryCacheEntry);
      if (entries.length !== payload.length) {
        console.warn('[Regions] Ignoring malformed entries in stored regions registry cache');
      }
      return entries.length > 0 ? entries : null;
    } catch (error) {
      console.warn('[Regions] Failed to load regions registry cache from storage', error);
      return null;
    }
  }

  private async persistStaticRegistryCache(entries: StaticRegistryCacheEntry[]): Promise<void> {
    if (!this.electronApi?.setStorageItem) {
      return;
    }

    try {
      await this.electronApi.setStorageItem(this.storageKey, entries);
    } catch (error) {
      console.warn('[Regions] Failed to persist regions registry cache to storage', error);
    }
  }

}

function resolveStoragePayload(storedValue: unknown): unknown {
  if (isObjectRecord(storedValue) && 'data' in storedValue) {
    return storedValue.data;
  }
  return storedValue;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStaticRegistryCacheEntry(value: unknown): value is StaticRegistryCacheEntry {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.cityCode === 'string' &&
    typeof value.datasetId === 'string' &&
    typeof value.displayName === 'string' &&
    typeof value.unitSingular === 'string' &&
    typeof value.unitPlural === 'string' &&
    typeof value.source === 'string' &&
    typeof value.dataPath === 'string'
  );
}
