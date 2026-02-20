import type { DatasetIndex, DatasetMetadata } from '@shared/dataset-index';

import { RegionDataset } from '../datasets/RegionDataset';
import {
  RegistryMissingDatasetError,
  RegistryMissingIndexError,
} from '../errors';
import {
  buildLocalDatasetUrl,
  getFeatureCount,
  resolveLocalModsDataRoot,
  STATIC_BASE_GAME_CITY_CODES,
  STATIC_BASE_GAME_DATASET_TEMPLATES,
  type StaticDatasetTemplate,
} from './static';

export class RegionDatasetRegistry {
  readonly datasets: Map<string, RegionDataset>;
  private indexFile: string;
  private serveUrl: string;

  constructor(indexFile: string, serveUrl: string) {
    this.indexFile = indexFile;
    this.serveUrl = serveUrl;
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
  ): void {
    this.assertDatasetIndexEntry(cityCode, entry);
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
    const registered = await this.buildFromStaticLocalFiles();
    if (registered === 0) {
      throw new Error('[Regions] No local datasets found in static mapping');
    }
  }

  private async buildFromStaticLocalFiles(): Promise<number> {
    const localModsDataRoot = await resolveLocalModsDataRoot();
    let registeredDatasets = 0;

    for (const cityCode of STATIC_BASE_GAME_CITY_CODES) {
      const datasetTemplates = STATIC_BASE_GAME_DATASET_TEMPLATES[cityCode];
      for (const template of datasetTemplates) {
        const dataPath = buildLocalDatasetUrl(
          localModsDataRoot,
          cityCode,
          template.datasetId,
        );

        const size = await getFeatureCount(dataPath);
        if (size === null) {
          continue;
        }

        this.registerStaticDataset(
          cityCode,
          this.buildDatasetEntryFromTemplate(template, size),
          dataPath,
        );
        registeredDatasets += 1;
      }
    }

    return registeredDatasets;
  }

  private buildDatasetEntryFromTemplate(
    template: StaticDatasetTemplate,
    size: number,
  ): DatasetMetadata {
    return {
      datasetId: template.datasetId,
      displayName: template.displayName,
      unitSingular: template.unitSingular,
      unitPlural: template.unitPlural,
      source: template.source,
      size,
    };
  }
}
