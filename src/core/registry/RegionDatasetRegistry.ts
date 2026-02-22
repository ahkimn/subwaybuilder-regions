import type {
  DatasetIndex,
  DatasetMetadata,
  StaticRegistryCacheEntry,
} from '@shared/dataset-index';

import type { ModdingAPI } from '../../types/modding-api-v1';
import { RegionDataset } from '../datasets/RegionDataset';
import {
  RegistryMissingDatasetError,
  RegistryMissingIndexError,
} from '../errors';
import type { RegionsSettingsStore } from '../settings/RegionsSettingsStore';
import { buildLocalDatasetUrl } from './fetch-local';
import { STATIC_TEMPLATES } from './static';

export class RegionDatasetRegistry {
  readonly datasets: Map<string, RegionDataset>;

  constructor(
    private api: ModdingAPI,
    private indexFile: string,
    private serveUrl: string,
    private readonly settingsStore: RegionsSettingsStore,
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

    const cachedRegistry = await this.settingsStore.loadRegistryCache();
    if (cachedRegistry && cachedRegistry.entries.length > 0) {
      const cachedPresentEntries = cachedRegistry.entries.filter(
        (entry) => entry.isPresent,
      );
      for (const entry of cachedPresentEntries) {
        this.registerStaticDataset(
          entry.cityCode,
          this.buildDatasetEntryFromCachedEntry(entry),
          entry.dataPath,
          { skipValidation: true },
        );
      }
      if (cachedPresentEntries.length > 0) {
        return;
      }
    }

    const discoveredEntries = await this.discoverStaticLocalDatasets();
    await this.settingsStore.saveRegistryCache({
      updatedAt: Date.now(),
      entries: discoveredEntries,
    });

    const discoveredPresentEntries = discoveredEntries.filter(
      (entry) => entry.isPresent,
    );
    for (const entry of discoveredPresentEntries) {
      this.registerStaticDataset(
        entry.cityCode,
        this.buildDatasetEntryFromCachedEntry(entry),
        entry.dataPath,
        { skipValidation: true },
      );
    }

    if (discoveredPresentEntries.length === 0) {
      throw new Error('[Regions] No local datasets found in static mapping');
    }
  }

  async refreshStaticRegistryCache(): Promise<number> {
    const discoveredEntries = await this.discoverStaticLocalDatasets();
    await this.settingsStore.saveRegistryCache({
      updatedAt: Date.now(),
      entries: discoveredEntries,
    });
    return discoveredEntries.filter((entry) => entry.isPresent).length;
  }

  private async discoverStaticLocalDatasets(): Promise<
    StaticRegistryCacheEntry[]
  > {
    const localModsDataRoot =
      await this.settingsStore.resolveLocalModsDataRoot();
    const discoveredEntries: StaticRegistryCacheEntry[] = [];

    const currentCities = this.api.utils.getCities();

    for (const city of currentCities) {
      console.log(
        `[Regions] Discovering local datasets for city ${city.code} (${city.name})...`,
      );
      const datasetTemplates = city.country
        ? (STATIC_TEMPLATES.get(city.country) ?? [])
        : [];
      for (const template of datasetTemplates) {
        const dataPath = buildLocalDatasetUrl(
          localModsDataRoot,
          city.code,
          template.datasetId,
        );

        const isPresent = await this.settingsStore.localFileExists(dataPath);
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

  private buildDatasetEntryFromCachedEntry(
    entry: StaticRegistryCacheEntry,
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
