import { RegionDataset } from "./datasets";

type RegistryIndexEntry = {
  id: string;
  name: string;
}

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
    this.datasets.set(dataset.getIdentifier(), dataset);
  }

  // -- Dataset Getters --
  getCityDatasets(cityCode: string): RegionDataset[] {
    return Array.from(this.datasets.values()).filter(
      (dataset) => dataset.cityCode === cityCode
    );
  }

  getDatasetByCityAndName(cityCode: string, name: string): RegionDataset | null {
    // Can this be made less brittle? Key generation is in the RegionDataset class
    return this.datasets.get(`${cityCode}-${name}`) || null;
  }

  // -- Dataset Mutations --
  async loadCityDatasets(cityCode: string) {
    const datasets = this.getCityDatasets(cityCode);
    await Promise.all(
      datasets.map((dataset) => dataset.load())
    );
  }

  // -- Setup -- //
  async build() {
      this.clear();
  
      const index = await fetch(this.indexFile).then(res => res.json());
  
      for (const[cityCode, datasets] of Object.entries(index)) {
        let colorIndex = 0;
  
        for (const idx of datasets as RegistryIndexEntry[]) {    
          this.registerDataset(
            new RegionDataset(
              idx.id,
              cityCode,
              {
                type: 'static',
                dataPath: `${this.serveUrl}/${cityCode}/${idx.id}.geojson`,
                writable: false
              },
            idx.name,
            colorIndex++
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
      console.log(` - ${key} (loaded: ${dataset.loaded}, writable: ${dataset.isWritable})`);
    }
  }
}