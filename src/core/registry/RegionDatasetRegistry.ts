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
import {
  buildLocalDatasetCandidatePaths,
  probeDatasetPath,
  probeLocalDatasetCandidates,
} from '../storage/helpers';
import type { RegionsStorage } from '../storage/RegionsStorage';
import { STATIC_TEMPLATES } from './static';

export class RegionDatasetRegistry {
  readonly datasets: Map<string, RegionDataset>;
  private readonly listeners = new Set<() => void>();

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
    this.emit();
  }

  listen(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
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
    const loadResults = await Promise.all(
      datasets.map((dataset) => dataset.load()),
    );
    const unresolvedDatasets = datasets.filter(
      (_, index) => !loadResults[index],
    );
    if (unresolvedDatasets.length > 0) {
      const unresolvedSummary = unresolvedDatasets.map((dataset) => {
        return `${RegionDataset.getIdentifier(dataset)} (${dataset.status})`;
      });
      console.warn(
        `[Regions] City ${cityCode} completed load with unresolved datasets: ${unresolvedSummary.join(', ')}`,
      );
    }
    onComplete();
  }

  // -- Setup -- //
  private validateIndexEntry(cityCode: string, entry: DatasetMetadata): void {
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

  private registerDatasetFromMetadata(
    cityCode: string,
    entry: DatasetMetadata,
    dataPath: string,
    options?: {
      skipValidation?: boolean;
      sourceType?: 'static' | 'user';
      writable?: boolean;
    },
  ): void {
    if (!options?.skipValidation) {
      this.validateIndexEntry(cityCode, entry);
    }
    this.registerDataset(
      new RegionDataset(entry, cityCode, {
        type: options?.sourceType ?? 'static',
        dataPath,
        writable: options?.writable ?? false,
      }),
    );
  }

  private buildFromIndex(index: DatasetIndex): number {
    let registeredDatasets = 0;
    for (const [cityCode, datasets] of Object.entries(index)) {
      for (const record of datasets) {
        this.registerDatasetFromMetadata(
          cityCode,
          record,
          `${this.serveUrl}/${cityCode}/${record.datasetId}.geojson`,
        );
        registeredDatasets += 1;
      }
    }
    return registeredDatasets;
  }

  async build(onFetchError: () => void): Promise<{
    servedCount: number;
    localCount: number;
  }> {
    this.clear();

    const localEntries = await this.resolveAndPersistLocalRegistryEntries();
    const localCount = this.registerLocalEntries(localEntries);

    let servedCount = 0;
    const servedIndex = await this.fetchServedIndex(onFetchError);
    if (servedIndex) {
      // Served datasets take precedence over local static/dynamic datasets on cityCode/datasetId collisions.
      servedCount = this.buildFromIndex(servedIndex);
    }

    if (this.datasets.size === 0) {
      throw new Error(
        '[Regions] No datasets available from server or local cache',
      );
    }

    return { servedCount, localCount };
  }

  async buildFromCache(onFetchError: () => void): Promise<{
    servedCount: number;
    localCount: number;
  }> {
    this.clear();

    const cachedLocalEntries = await this.loadCachedLocalRegistryEntries();
    const localCount = this.registerLocalEntries(cachedLocalEntries);

    let servedCount = 0;
    const servedIndex = await this.fetchServedIndex(onFetchError);
    if (servedIndex) {
      // Served datasets take precedence over local static/dynamic datasets on cityCode/datasetId collisions.
      servedCount = this.buildFromIndex(servedIndex);
    }

    if (this.datasets.size === 0) {
      throw new Error(
        '[Regions] No datasets available from server index or cached local registry',
      );
    }

    return { servedCount, localCount };
  }

  clear(): void {
    this.datasets.clear();
    this.emit();
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

    const localEntries = await this.resolveAndPersistLocalRegistryEntries();
    const localCount = this.registerLocalEntries(localEntries);
    if (localCount === 0) {
      throw new Error(
        '[Regions] No local datasets found in static mapping or dynamic cache',
      );
    }
  }

  async refreshStaticRegistryCache(): Promise<number> {
    const discoveredEntries = await this.resolveLocalRegistryEntries();
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
        const candidatePaths = buildLocalDatasetCandidatePaths(
          localModsDataRoot,
          city.code,
          template.datasetId,
        );
        const probeResult = await probeLocalDatasetCandidates(candidatePaths);
        if (!probeResult.isPresent) {
          continue;
        }
        discoveredEntries.push({
          cityCode: city.code,
          datasetId: template.datasetId,
          displayName: template.displayName,
          unitSingular: template.unitSingular,
          unitPlural: template.unitPlural,
          source: template.source,
          size: 0,
          dataPath: probeResult.dataPath,
          isPresent: probeResult.isPresent,
          origin: 'static',
          fileSizeMB: probeResult.fileSizeMB,
          compressed: probeResult.compressed,
        });
      }
    }
    return discoveredEntries;
  }

  private async fetchServedIndex(
    onFetchError: () => void,
  ): Promise<DatasetIndex | null> {
    try {
      const indexResponse = await fetch(`${this.serveUrl}/${this.indexFile}`);
      if (!indexResponse.ok) {
        throw new RegistryMissingIndexError(this.indexFile, this.serveUrl);
      }

      return (await indexResponse.json()) as DatasetIndex;
    } catch {
      onFetchError();
      return null;
    }
  }

  private async resolveAndPersistLocalRegistryEntries(): Promise<
    RegistryCacheEntry[]
  > {
    const entries = await this.resolveLocalRegistryEntries();
    await this.storage.saveRegistry({
      updatedAt: Date.now(),
      entries,
    });
    return entries;
  }

  private async loadCachedLocalRegistryEntries(): Promise<
    RegistryCacheEntry[]
  > {
    const storedRegistry = await this.storage.loadStoredRegistry();
    return dedupeRegistryEntries(storedRegistry?.entries ?? []);
  }

  private async resolveLocalRegistryEntries(): Promise<RegistryCacheEntry[]> {
    const storedRegistry = await this.storage.loadStoredRegistry();
    const storedEntries = storedRegistry?.entries ?? [];

    const discoveredStaticEntries = await this.locateStaticLocalDatasets();
    const discoveredStaticKeySet = new Set(
      discoveredStaticEntries.map((entry) =>
        this.getDatasetKey(entry.cityCode, entry.datasetId),
      ),
    );

    const supplementalStoredStatic = await Promise.all(
      storedEntries
        .filter((entry) => entry.origin === 'static')
        .filter(
          (entry) =>
            !discoveredStaticKeySet.has(
              this.getDatasetKey(entry.cityCode, entry.datasetId),
            ),
        )
        .map((entry) => this.revalidateStoredEntry(entry)),
    );
    const retainedStoredStatic = supplementalStoredStatic.filter(
      (entry) => entry.isPresent || entry.fileSizeMB !== null,
    );

    const revalidatedDynamicEntries = await Promise.all(
      storedEntries
        .filter((entry) => entry.origin === 'dynamic')
        .map((entry) => this.revalidateStoredEntry(entry)),
    );
    const retainedDynamicEntries = revalidatedDynamicEntries.filter(
      (entry) => entry.isPresent || entry.fileSizeMB !== null,
    );

    return dedupeRegistryEntries([
      ...discoveredStaticEntries,
      ...retainedStoredStatic,
      ...retainedDynamicEntries,
    ]);
  }

  private async revalidateStoredEntry(
    entry: RegistryCacheEntry,
  ): Promise<RegistryCacheEntry> {
    const probeResult = await probeDatasetPath(entry.dataPath);
    return {
      ...entry,
      dataPath: probeResult.dataPath,
      isPresent: probeResult.isPresent,
      fileSizeMB: probeResult.fileSizeMB ?? entry.fileSizeMB,
      compressed: probeResult.isPresent
        ? probeResult.compressed
        : entry.compressed,
    };
  }

  private registerLocalEntries(entries: RegistryCacheEntry[]): number {
    let registered = 0;

    const registerOrigin = (origin: 'static' | 'dynamic') => {
      entries
        .filter((entry) => entry.origin === origin && entry.isPresent)
        .forEach((entry) => {
          this.registerDatasetFromMetadata(
            entry.cityCode,
            this.buildDatasetEntryFromStorage(entry),
            entry.dataPath,
            {
              skipValidation: true,
              sourceType: entry.origin === 'dynamic' ? 'user' : 'static',
              writable: entry.origin === 'dynamic',
            },
          );
          registered += 1;
        });
    };

    // Local dynamic entries should override local static entries.
    registerOrigin('static');
    registerOrigin('dynamic');

    return registered;
  }

  private getDatasetKey(cityCode: string, datasetId: string): string {
    return `${cityCode}::${datasetId}`;
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

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

function dedupeRegistryEntries(
  entries: RegistryCacheEntry[],
): RegistryCacheEntry[] {
  const deduped = new Map<string, RegistryCacheEntry>();
  entries.forEach((entry) => {
    deduped.set(
      `${entry.cityCode}::${entry.datasetId}::${entry.origin}`,
      entry,
    );
  });
  return Array.from(deduped.values());
}
