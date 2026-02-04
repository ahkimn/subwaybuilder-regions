import { MapListener } from "../../map/render";
import { PRIMARY_FILL_COLORS } from "../../ui/types/DisplayColor";
import { fetchGeoJSON } from "../../utils/utils";
import { DatasetSource, LAYER_PREFIX, SOURCE_PREFIX } from "./types";


export class RegionDataset {
  readonly id: string; // name (e.x. "districts", "bua", "my_zones")
  readonly cityCode: string; // city identifier (e.x. "LON", "MAN", "BOS")
  readonly source: DatasetSource;

  // Optional, mutable display name for UI
  displayName: string;

  // Data store properties (boundaries / labels)
  boundaryData: GeoJSON.FeatureCollection | null = null;
  labelData: GeoJSON.FeatureCollection | null = null;

  // Map layer properties
  boundaryLayerId: string | null = null;
  boundaryLineLayerId: string | null = null;

  labelLayerId: string | null = null;

  boundaryDisplayColor: string | null = null;
  hoverDisplayColor: string | null = null;

  // Map interaction properties
  visible: boolean = false;

  labelLayerListeners: MapListener[] = [];

  // Data state properties
  loaded: boolean = false;
  isUserEdited: boolean = false;

  constructor(
    id: string,
    cityCode: string,
    source: DatasetSource,
    displayName?: string,
    colorIndex?: number
  ) {
    this.id = id;
    this.cityCode = cityCode;
    this.source = source;
    this.displayName = displayName ? displayName : id;
    if (colorIndex != null) {
      this.boundaryDisplayColor = PRIMARY_FILL_COLORS[colorIndex % PRIMARY_FILL_COLORS.length].hex;
      this.hoverDisplayColor = PRIMARY_FILL_COLORS[colorIndex % PRIMARY_FILL_COLORS.length].hover || null;
    }
  }

  get isWritable(): boolean {
    return this.source.writable;
  }

  get dataPath(): string {
    return this.source.dataPath;
  }

  async load(): Promise<boolean> {
    if (this.loaded) {
      return true;
    }
    try {
      this.boundaryData = await fetchGeoJSON(this.source.dataPath);
      this.buildLabelData();
      this.loaded = true;
      this.isUserEdited = false;
      return true;
      // We don't want to error out the mod if any single dataset fails to load properly
    } catch (err) {
      console.warn(err);
      this.loaded = false;
      this.boundaryData = null;
      this.labelData = null;
      return false;
    }
  }

  unloadData(): void {
    // Dereference data -- not sure how much this will realistically help with JS garbage collection :/
    this.boundaryData = null;
    this.labelData = null;
    this.boundaryLayerId = null;
    this.boundaryLineLayerId = null;
    this.labelLayerId = null;
    this.loaded = false;
    this.isUserEdited = false;
    this.visible = false;
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

  setLayerIds(ids: {
    boundaryLayerId: string;
    boundaryLineLayerId: string;
    labelLayerId: string;
  }) {
    this.boundaryLayerId = ids.boundaryLayerId;
    this.boundaryLineLayerId = ids.boundaryLineLayerId;
    this.labelLayerId = ids.labelLayerId;
  }

  clearLayerIds() {
    this.boundaryLayerId = null;
    this.boundaryLineLayerId = null;
    this.labelLayerId = null;
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
