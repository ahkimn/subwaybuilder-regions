import type {
  DatasetIndex,
  DatasetMetadata,
  RegistryCacheEntry,
} from '@shared/dataset-index';

import type { ModdingAPI } from '../../types/modding-api-v1';
import { RegionDataset } from '../datasets/RegionDataset';
import {
  RegistryMissingDatasetError,
  RegistryMissingIndexError,
} from '../errors';
import { buildLocalDatasetUrl, localFileExists } from '../storage/helpers';
import type { RegionsStorage } from '../storage/RegionsStorage';
import { STATIC_TEMPLATES } from './static';

export class RegionDatasetRegistry {
  readonly datasets: Map<string, RegionDataset>;

  constructor(
    private api: ModdingAPI,
    private indexFile: string,
    private serveUrl: string,
    private readonly storage: RegionsStorage,
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
  private validateIndexEntry(
    cityCode: string,
    entry: DatasetMetadata,
  ): void {
    if (
      !entry.datasetId ||
      !entry.displayName ||
      !entry.unitSingular ||
      !entry.unitPlural ||
      !entry.source ||
      !Number.isInteger(entry.size) ||
      entry.size <= 0
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
      this.validateIndexEntry(cityCode, entry);
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

    // First check if local storage has a cached registry and if so attempt to register the data present
    const storedRegistry = await this.storage.loadStoredRegistry();
    if (storedRegistry && storedRegistry.entries.length > 0) {
      const presentEntries = storedRegistry.entries.filter(
        (entry) => entry.isPresent,
      );
      for (const entry of presentEntries) {
        this.registerStaticDataset(
          entry.cityCode,
          this.buildDatasetEntryFromStorage(entry),
          entry.dataPath,
          { skipValidation: true },
        );
      }
      if (presentEntries.length > 0) {
        return;
      }
    }

    console.log(
      '[Regions] No valid cached registry found, attempting to locate local datasets from static mapping...',
    );
    const localEntries = await this.locateStaticLocalDatasets();
    await this.storage.saveRegistry({
      updatedAt: Date.now(),
      entries: localEntries,
    });
    const presentEntries = localEntries.filter((entry) => entry.isPresent);
    for (const entry of presentEntries) {
      this.registerStaticDataset(
        entry.cityCode,
        this.buildDatasetEntryFromStorage(entry),
        entry.dataPath,
        { skipValidation: true },
      );
    }

    if (presentEntries.length === 0) {
      throw new Error('[Regions] No local datasets found in static mapping');
    }
  }

  async refreshStaticRegistryCache(): Promise<number> {
    const discoveredEntries = await this.locateStaticLocalDatasets();
    await this.storage.saveRegistry({
      updatedAt: Date.now(),
      entries: discoveredEntries,
    });
    return discoveredEntries.filter((entry) => entry.isPresent).length;
  }

  private async locateStaticLocalDatasets(): Promise<RegistryCacheEntry[]> {
    const localModsDataRoot = await this.storage.resolveLocalModsDataRoot();
    const discoveredEntries: RegistryCacheEntry[] = [];

    const currentCities = this.api.utils.getCities();

    for (const city of currentCities) {
      const datasetTemplates = city.country
        ? (STATIC_TEMPLATES.get(city.country) ?? [])
        : [];
      for (const template of datasetTemplates) {
        const dataPath = buildLocalDatasetUrl(
          localModsDataRoot,
          city.code,
          template.datasetId,
        );
        const isPresent = await localFileExists(dataPath);
        discoveredEntries.push({
          cityCode: city.code,
          datasetId: template.datasetId,
          displayName: template.displayName,
          unitSingular: template.unitSingular,
          unitPlural: template.unitPlural,
          source: template.source,
          size: 0,
          dataPath,
          isPresent,
        });
      }
    }
    return discoveredEntries;
  }

  private buildDatasetEntryFromStorage(
    entry: RegistryCacheEntry,
  ): DatasetMetadata {
    return {
      datasetId: entry.datasetId,
      displayName: entry.displayName,
      unitSingular: entry.unitSingular,
      unitPlural: entry.unitPlural,
      source: entry.source,
      size: entry.size,
    };
  }
}
