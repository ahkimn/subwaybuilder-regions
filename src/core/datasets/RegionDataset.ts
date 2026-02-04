import { fetchGeoJSON } from "../../utils/utils";
import { DatasetSource, DatasetStatus } from "./types";

export const SOURCE_PREFIX = 'regions-src';
export const LAYER_PREFIX = 'regions-layer';

export class RegionDataset {
  readonly id: string; // name (e.x. "districts", "bua", "my_zones")
  readonly cityCode: string; // city identifier (e.x. "LON", "MAN", "BOS")
  readonly source: DatasetSource;

  // Optional, mutable display name for UI
  displayName: string;

  // Data store properties (boundaries / labels)
  boundaryData: GeoJSON.FeatureCollection | null = null;
  labelData: GeoJSON.FeatureCollection | null = null;

  status: DatasetStatus = DatasetStatus.Unloaded;
  isUserEdited: boolean = false;

  constructor(
    id: string,
    cityCode: string,
    source: DatasetSource,
    displayName?: string,
  ) {
    this.id = id;
    this.cityCode = cityCode;
    this.source = source;
    this.displayName = displayName ? displayName : id;
  }

  get isWritable(): boolean {
    return this.source.writable;
  }

  get dataPath(): string {
    return this.source.dataPath;
  }

  get isLoaded(): boolean {
    return this.status === DatasetStatus.Loaded;
  }

  private async loadBoundaryData(): Promise<void> {
    this.boundaryData = await fetchGeoJSON(this.source.dataPath);
  }

  private unloadData(): void {
    this.boundaryData = null;
    this.labelData = null;
  }

  async load(): Promise<boolean> {
    if (this.status === DatasetStatus.Loaded) {
      return true;
    }

    if (this.status === DatasetStatus.Loading) {
      return false;
    }

    this.status = DatasetStatus.Loading;

    try {
      await this.loadBoundaryData();
      this.buildLabelData();
      this.status = DatasetStatus.Loaded;
      this.isUserEdited = false;
      return true;
    } catch (err) {
      console.warn(
        `[Regions] Failed to load dataset: ${this.id} for city ${this.cityCode}: `, err
      );
      this.status = DatasetStatus.Error;
      this.unloadData();
      return false;
    }
  }

  clearData(): void {
    this.unloadData();
    this.status = DatasetStatus.Unloaded;
    this.isUserEdited = false;
  }

  markEdited(): void {
    if (this.isWritable) {
      this.isUserEdited = true;
    } else {
      console.warn(`Attempted to mark read-only dataset: ${this.id} for city ${this.cityCode} as edited.`);
    }
  }

  getLayerPrefix(): string {
    return `${LAYER_PREFIX}-${this.cityCode}-${this.id}`;
  }

  getSourcePrefix(): string {
    return `${SOURCE_PREFIX}-${this.cityCode}-${this.id}`;
  }

  getIdentifier(): string {
    return `${this.cityCode}-${this.id}`;
  }

  buildLabelData(): void {
    if (!this.boundaryData) {
      throw new Error(`Cannot build label data with unloaded boundary data for dataset: ${this.id} for city ${this.cityCode}`);
    }

    const labelFeatures = new Array<GeoJSON.Feature>();

    this.boundaryData.features.forEach((feature) => {
      const { LAT, LNG, NAME, DISPLAY_NAME, ID } = feature.properties ?? {};

      if (DISPLAY_NAME == null && NAME == null) {
        console.warn(`\tFeature missing NAME and DISPLAY_NAME property, cannot build label: ${feature.id}`);
        return;
      }

      if (LAT == null || LNG == null) {
        console.warn(`\tFeature with name: ${NAME} missing LAT/LONG properties, cannot build label.`);
        return;
      }

      const labelFeature: GeoJSON.Feature = {
        type: 'Feature',
        id: feature.id, // share ID with boundary feature
        geometry: {
          type: 'Point',
          coordinates: [LNG, LAT]
        },
        properties: {
          NAME: DISPLAY_NAME || NAME,
          ID: ID
        }
      };

      labelFeatures.push(labelFeature);
    });

    this.labelData = {
      type: 'FeatureCollection',
      features: labelFeatures
    };
  }
}
