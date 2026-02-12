import { RegionDataset } from "../datasets/RegionDataset";
import { RegistryMissingDatasetError, RegistryMissingIndexError } from "../errors";

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
      (dataset) => dataset.cityCode === cityCode
    );
  }

  getCityDatasetIds(cityCode: string): string[] {
    return this.getCityDatasets(cityCode).map(dataset => RegionDataset.getIdentifier(dataset));
  }

  getDatasetByIdentifier(identifier: string): RegionDataset {
    const dataset = this.datasets.get(identifier) || null;
    if (!dataset) {
      throw new RegistryMissingDatasetError(identifier);
    }
    return dataset;
  }

  // -- Dataset Mutations --
  async loadCityDatasets(cityCode: string, onComplete: () => void) {
    const datasets = this.getCityDatasets(cityCode);
    await Promise.all(
      datasets.map((dataset) => dataset.load())
    );
    onComplete();
  }

  // -- Setup -- //
  async build(onFetchError: () => void) {
    this.clear();

    // Expected format of index.json is { [cityCode: string]: { id: string; displayName: string }[] }
    let index: Record<string, { id: string; name: string }[]> = {};
    try {
      index = await fetch(`${this.serveUrl}/${this.indexFile}`).then(res => res.json());
    } catch (e) {
      onFetchError();
      throw new RegistryMissingIndexError(this.indexFile, this.serveUrl);
    }

    for (const [cityCode, datasets] of Object.entries(index)) {

      for (const record of datasets) {
        const { id, name } = record;
        this.registerDataset(
          new RegionDataset(
            id,
            cityCode,
            {
              type: 'static',
              dataPath: `${this.serveUrl}/${cityCode}/${id}.geojson`,
              writable: false
            },
            name
          )
        )
      }
    }
  }

  clear(): void {
    this.datasets.clear();
  }

  // -- Debugging --
  printIndex(): void {
    console.log("Registered Region Datasets:");
    for (const [key, dataset] of this.datasets.entries()) {
      console.log(` - ${key} (status: ${dataset.status}, writable: ${dataset.isWritable})`);
    }
  }
}