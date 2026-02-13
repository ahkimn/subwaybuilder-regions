import type { DatasetIndex, DatasetIndexEntry } from '@shared/dataset-index';

import { RegionDataset } from '../datasets/RegionDataset';
import {
  RegistryMissingDatasetError,
  RegistryMissingIndexError,
} from '../errors';

export class RegionDatasetRegistry {
  readonly datasets: Map<string, RegionDataset>;
  private indexFile: string;
  private serveUrl: string;

  constructor(indexFile: string, serveUrl: string) {
    this.indexFile = indexFile;
    this.serveUrl = serveUrl;
    this.datasets = new Map<string, RegionDataset>();
  }

  // -- Dataset Setters --
  registerDataset(dataset: RegionDataset): void {
    this.datasets.set(RegionDataset.getIdentifier(dataset), dataset);
  }

  // -- Dataset Getters --
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

  // -- Dataset Mutations --
  async loadCityDatasets(cityCode: string, onComplete: () => void) {
    const datasets = this.getCityDatasets(cityCode);
    await Promise.all(datasets.map((dataset) => dataset.load()));
    onComplete();
  }

  // -- Setup -- //
  private assertDatasetIndexEntry(
    cityCode: string,
    entry: DatasetIndexEntry,
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

  async build(onFetchError: () => void) {
    this.clear();

    // Expected format of index.json is { [cityCode: string]: DatasetIndexEntry[] }
    let index: DatasetIndex = {};
    try {
      index = await fetch(`${this.serveUrl}/${this.indexFile}`).then((res) =>
        res.json(),
      );
    } catch (e) {
      onFetchError();
      throw new RegistryMissingIndexError(this.indexFile, this.serveUrl);
    }

    for (const [cityCode, datasets] of Object.entries(index)) {
      for (const record of datasets) {
        this.assertDatasetIndexEntry(cityCode, record);
        this.registerDataset(
          new RegionDataset(
            record,
            cityCode,
            {
              type: 'static',
              dataPath: `${this.serveUrl}/${cityCode}/${record.datasetId}.geojson`,
              writable: false,
            },
          ),
        );
      }
    }
  }

  clear(): void {
    this.datasets.clear();
  }

  // -- Debugging --
  printIndex(): void {
    console.log('Registered Region Datasets:');
    for (const [key, dataset] of this.datasets.entries()) {
      console.log(
        ` - ${key} (status: ${dataset.status}, writable: ${dataset.isWritable})`,
      );
    }
  }
}
