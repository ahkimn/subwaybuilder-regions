import type {
  DatasetIndex,
  DatasetMetadata,
  RegistryCacheEntry,
} from '@shared/dataset-index';
import { DATASET_METADATA_CATALOG } from '@shared/datasets/catalog';

import type { ModdingAPI } from '../../types/api';
import { RegionDataset } from '../datasets/RegionDataset';
import type { DatasetOrigin } from '../domain';
import {
  RegistryMissingDatasetError,
  RegistryMissingIndexError,
} from '../errors';
import {
  buildLocalDatasetCandidatePaths,
  tryDatasetPath,
  tryLocalDatasetPaths,
} from '../storage/helpers';
import type { RegionsStorage } from '../storage/RegionsStorage';
import { resolveStaticTemplateCountry, STATIC_TEMPLATES } from './static';

export type DynamicValidationRequest = {
  cityCode: string;
  countryCode: string;
  datasetIds: string[];
};

export type DynamicValidationResult = {
  cityCode: string;
  foundIds: string[];
  missingIds: string[];
  updatedEntries: RegistryCacheEntry[];
};

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
    // If any dataset failed to load, inform user with a warning but still continue with any remaining datasets
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

  // --- Dataset Registry --- //
  private registerDatasetFromMetadata(
    cityCode: string,
    entry: DatasetMetadata,
    dataPath: string,
    options: {
      skipValidation?: boolean;
      sourceType: DatasetOrigin;
      writable: boolean;
    },
  ): void {
    if (!options?.skipValidation) {
      this.validateIndexEntry(cityCode, entry);
    }
    this.registerDataset(
      new RegionDataset(entry, cityCode, {
        type: options.sourceType,
        dataPath,
        writable: options.writable,
      }),
    );
  }

  private registerLocalEntries(entries: RegistryCacheEntry[]): number {
    let registered = 0;

    const registerbyOrigin = (origin: DatasetOrigin) => {
      entries
        .filter((entry) => entry.origin === origin && entry.isPresent)
        .forEach((entry) => {
          this.registerDatasetFromMetadata(
            entry.cityCode,
            this.buildDatasetEntryFromStorage(entry),
            entry.dataPath,
            {
              skipValidation: true,
              sourceType: entry.origin,
              writable: entry.origin === 'user',
            },
          );
          registered += 1;
        });
    };

    // Dynamically created/updated entries should override local static entries.
    registerbyOrigin('static');
    registerbyOrigin('dynamic');

    return registered;
  }

  // --- Registry Building --- //
  private buildFromIndex(index: DatasetIndex): number {
    let registeredDatasets = 0;
    for (const [cityCode, datasets] of Object.entries(index)) {
      for (const record of datasets) {
        this.registerDatasetFromMetadata(
          cityCode,
          record,
          `${this.serveUrl}/${cityCode}/${record.datasetId}.geojson`,
          {
            sourceType: 'served',
            writable: false,
          },
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

    const localEntries = await this.resolveAndPersistLocalCacheEntries();
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

  async buildStatic(): Promise<void> {
    this.clear();

    const localEntries = await this.resolveAndPersistLocalCacheEntries();
    const localCount = this.registerLocalEntries(localEntries);
    if (localCount === 0) {
      throw new Error(
        '[Regions] No local datasets found in static mapping or dynamic cache',
      );
    }
  }

  async buildFromCache(onFetchError: () => void): Promise<{
    servedCount: number;
    localCount: number;
  }> {
    this.clear();

    const storedRegistry = await this.storage.loadStoredRegistry();
    // On first registry build, there will be no cache so we will need to attempt to resolve local datasets from disk and build an initial cache
    const localEntries =
      storedRegistry === null
        ? await this.resolveAndPersistLocalCacheEntries()
        : dedupeRegistryEntries(storedRegistry.entries);
    const localCount = this.registerLocalEntries(localEntries);

    let servedCount = 0;
    const servedIndex = await this.fetchServedIndex(onFetchError);
    if (servedIndex) {
      // Served datasets take precedence over local static/dynamic datasets on cityCode/datasetId collisions.
      servedCount = this.buildFromIndex(servedIndex);
    }

    // TODO (Feature): This should be an error only once in-game downloads are made available
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

  // --- Served Index Helpers --- //
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

  private validateIndexEntry(cityCode: string, entry: DatasetMetadata): void {
    const hasValidFileSize =
      entry.fileSizeMB === undefined ||
      (Number.isFinite(entry.fileSizeMB) && entry.fileSizeMB >= 0);
    if (
      !entry.datasetId ||
      !entry.displayName ||
      !entry.unitSingular ||
      !entry.unitPlural ||
      !entry.source ||
      !Number.isInteger(entry.size) ||
      entry.size <= 0 ||
      !hasValidFileSize
    ) {
      throw new Error(
        `[Regions] Invalid dataset index entry for city ${cityCode}: ${JSON.stringify(entry)}`,
      );
    }
  }

  // --- Static Fallback Helpers --- //
  // TODO: (Feature) Add support for dynamic registry updates and remove hard-coded static index
  async refreshRegistryCache(): Promise<number> {
    const localEntries = await this.resolveLocalCacheEntries();
    await this.storage.saveRegistry({
      updatedAt: Date.now(),
      entries: localEntries,
    });
    return localEntries.filter((entry) => entry.isPresent).length;
  }

  /*
    Helper function to brute-force probe the mod's data directory for the presence of datasets based on a known set of filename templates and return registry entries for any that are found.

    This is necessary to support users who do not have access to a served dataset index; however, this approach is not be scalable to large numbers of datasets and should only be run when necessary (e.g. on first registry build and/or user-initiated refreshes)
    */
  private async locateStaticLocalDatasets(): Promise<RegistryCacheEntry[]> {
    const localModsDataRoot = await this.storage.resolveLocalModsDataRoot();
    const entries: RegistryCacheEntry[] = [];

    // Limit discovery to cities currently present in the game.
    const currentCities = this.api.utils.getCities();

    for (const city of currentCities) {
      const resolvedCountry = resolveStaticTemplateCountry(city);
      const datasetTemplates = resolvedCountry
        ? (STATIC_TEMPLATES.get(resolvedCountry) ?? [])
        : [];
      for (const template of datasetTemplates) {
        const candidatePaths = buildLocalDatasetCandidatePaths(
          localModsDataRoot,
          city.code,
          template.datasetId,
        );
        const result = await tryLocalDatasetPaths(candidatePaths);
        if (!result.isPresent) {
          continue;
        }
        entries.push({
          cityCode: city.code,
          datasetId: template.datasetId,
          displayName: template.displayName,
          unitSingular: template.unitSingular,
          unitPlural: template.unitPlural,
          source: template.source,
          size: 0,
          dataPath: result.dataPath,
          isPresent: result.isPresent,
          origin: 'static',
          fileSizeMB: result.fileSizeMB,
          compressed: result.compressed,
        });
      }
    }
    return entries;
  }

  // --- Dynamic Dataset Helpers --- //

  async validateDynamicFetchOutputs(
    request: DynamicValidationRequest,
  ): Promise<DynamicValidationResult> {
    const localModsDataRoot = await this.storage.resolveLocalModsDataRoot();
    const foundIds: string[] = [];
    const missingIds: string[] = [];
    const updatedEntries: RegistryCacheEntry[] = [];

    for (const datasetId of request.datasetIds) {
      const metadata = DATASET_METADATA_CATALOG[datasetId];
      if (!metadata) {
        console.warn(
          `[Regions] Missing catalog metadata for dynamic dataset ${datasetId}; skipping validation for city ${request.cityCode}.`,
        );
        missingIds.push(datasetId);
        continue;
      }

      const candidatePaths = buildLocalDatasetCandidatePaths(
        localModsDataRoot,
        request.cityCode,
        datasetId,
      );

      const result = await tryLocalDatasetPaths(candidatePaths);

      if (result.isPresent) {
        foundIds.push(datasetId);
      } else {
        missingIds.push(datasetId);
      }

      updatedEntries.push({
        cityCode: request.cityCode,
        datasetId: metadata.datasetId,
        displayName: metadata.displayName,
        unitSingular: metadata.unitSingular,
        unitPlural: metadata.unitPlural,
        source: metadata.source,
        size: 0,
        dataPath: result.dataPath,
        isPresent: result.isPresent,
        origin: 'dynamic',
        fileSizeMB: result.fileSizeMB,
        compressed: result.compressed,
      });
    }

    await this.upserEntriesByOrigin(
      request.cityCode,
      request.datasetIds,
      updatedEntries,
      'dynamic',
    );

    return {
      cityCode: request.cityCode,
      foundIds,
      missingIds,
      updatedEntries,
    };
  }

  // --- Local Cache Helpers --- //

  private async resolveAndPersistLocalCacheEntries(): Promise<
    RegistryCacheEntry[]
  > {
    const entries = await this.resolveLocalCacheEntries();
    await this.storage.saveRegistry({
      updatedAt: Date.now(),
      entries,
    });
    return entries;
  }

  private async resolveLocalCacheEntries(): Promise<RegistryCacheEntry[]> {
    const storedRegistry = await this.storage.loadStoredRegistry();
    const storedEntries = storedRegistry?.entries ?? [];

    const locatedEntries = await this.locateStaticLocalDatasets();
    // In the registry, datasets are uniquely identified by their cityCode/datasetId pair
    const locatedKeySet = new Set(
      locatedEntries.map((entry) =>
        getEntryKey(entry.cityCode, entry.datasetId),
      ),
    );

    // Retain any previously stored static entries that were not located on disk via the discovery process -- the user may opt to purge these entries from the cache manually but we do not want to automatically discard them
    const missingStoredEntries = await Promise.all(
      storedEntries
        .filter((entry) => entry.origin === 'static')
        .filter(
          (entry) =>
            !locatedKeySet.has(getEntryKey(entry.cityCode, entry.datasetId)),
        )
        .map((entry) => this.validateStoredEntry(entry)),
    );
    const retainedStoredStatic = missingStoredEntries.filter(
      (entry) => entry.isPresent || entry.fileSizeMB !== undefined,
    );

    // (TODO): We do not yet have any dynamic datasets but will need to further expand on this logic when they are added to include user-created datasets that may not be included in the static discovery process
    const revalidatedDynamicEntries = await Promise.all(
      storedEntries
        .filter((entry) => entry.origin === 'dynamic')
        .map((entry) => this.validateStoredEntry(entry)),
    );
    const retainedDynamicEntries = revalidatedDynamicEntries.filter(
      (entry) => entry.isPresent || entry.fileSizeMB !== undefined,
    );

    return dedupeRegistryEntries([
      ...locatedEntries,
      ...retainedStoredStatic,
      ...retainedDynamicEntries,
    ]);
  }

  private async validateStoredEntry(
    entry: RegistryCacheEntry,
  ): Promise<RegistryCacheEntry> {
    const probeResult = await tryDatasetPath(entry.dataPath);
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

  private async upserEntriesByOrigin(
    cityCode: string,
    datasetIds: string[],
    nextDynamicEntries: RegistryCacheEntry[],
    origin: DatasetOrigin,
  ): Promise<void> {
    const storedRegistry = await this.storage.loadStoredRegistry();
    const existingEntries = storedRegistry?.entries ?? [];
    const datasetIdSet = new Set(datasetIds);
    const retainedEntries = existingEntries.filter(
      (entry) =>
        !(
          entry.origin === origin &&
          entry.cityCode === cityCode &&
          datasetIdSet.has(entry.datasetId)
        ),
    );

    await this.storage.saveRegistry({
      updatedAt: Date.now(),
      entries: dedupeRegistryEntries([
        ...retainedEntries,
        ...nextDynamicEntries,
      ]),
    });
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
      fileSizeMB: entry.fileSizeMB,
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

function getEntryKey(cityCode: string, datasetId: string): string {
  return `${cityCode}-${datasetId}`;
}

function dedupeRegistryEntries(
  entries: RegistryCacheEntry[],
): RegistryCacheEntry[] {
  const deduped = new Map<string, RegistryCacheEntry>();
  entries.forEach((entry) => {
    deduped.set(`${entry.cityCode}-${entry.datasetId}-${entry.origin}`, entry);
  });
  return Array.from(deduped.values());
}
