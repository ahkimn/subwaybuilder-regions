import { Feature, MultiPolygon, Polygon } from "geojson";
import { DemandData } from "../../types";
import { fetchGeoJSON } from "../../utils/utils";
import { isCoordinateWithinFeature, isPolygonFeature } from "../geometry/helpers";
import { DatasetSource, DatasetStatus, RegionDemandDetails, RegionDisplayDetails } from "./types";

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

  // Display / demand details mapped by feature ID
  displayData: Map<string | number, RegionDisplayDetails> = new Map();

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
    console.log(`[Regions] Loading dataset: ${this.id} for city ${this.cityCode}`);

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
      this.populateStaticDisplayData();
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

  // TODO: Add incremental update methods for demand details when that functionality is added to the game
  // TODO: This is also quite slow and probably should be async 
  updateWithDemandData(demandData: DemandData): void {

    if (!this.displayData.size || !this.boundaryData) {
      throw new Error(`Cannot build demand details with empty display or boundary data for: ${this.id}`);
    }

    const addedDemandPointIds: Set<string> = new Set();

    // TODO: Optimize this
    this.boundaryData.features.forEach((feature) => {

      if (!isPolygonFeature(feature)) {
        console.error(`Non-polygon feature exists in boundary data for dataset: ${this.id}. Skipping feature ID: ${feature.id}`);
        return;
      }

      const featureId: string | number = feature.properties?.ID!;
      const demandPointIds: Set<string> = new Set();
      const populationIds: Set<string> = new Set();

      let residents = 0;
      let workers = 0;

      demandData.points.forEach((point, id) => {
        const location = point.location
        const [lng, lat] = location;

        // Check if demand point is within the region feature, including boundary
        if (isCoordinateWithinFeature(lat, lng, feature as Feature<Polygon | MultiPolygon>)) {
          if (addedDemandPointIds.has(id)) {
            // Multiple regions contain the same demand point if it lies on a boundary
            console.warn(`Demand point ID: ${id} already assigned to a region in dataset: ${this.id}. Skipping duplicate assignment.`);
            return;
          }

          demandPointIds.add(id);
          addedDemandPointIds.add(id);

          residents += point.residents;
          workers += point.jobs;

          point.popIds.forEach(popId => populationIds.add(popId));
        }
      })

      const regionDemandDetails: RegionDemandDetails = {
        demandPointIds,
        populationIds,
        demandPoints: demandPointIds.size,
        residents,
        workers,
      };

      this.displayData.get(featureId)!.demandDetails = regionDemandDetails;
    });
  }

  private populateStaticDisplayData(): void {
    if (!this.boundaryData) {
      throw new Error(`Cannot populate static display data with unloaded boundary data for dataset: ${this.id}`);
    }
    this.boundaryData.features.forEach((feature) => {
      const featureId: string | number = feature.properties?.ID!;
      const displayName: string = feature.properties?.DISPLAY_NAME || feature.properties?.NAME!;

      this.displayData.set(featureId, {
        displayName,
        area: feature.properties?.TOTAL_AREA!,
        gameArea: feature.properties?.AREA_WITHIN_BBOX!,
        realPopulation: feature.properties?.POPULATION || null,
        demandDetails: null
      });
    });
  }

  buildLabelData(): void {
    if (!this.boundaryData) {
      throw new Error(`Cannot build label data with unloaded boundary data for dataset: ${this.id}`);
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

  getFeatureDisplayData(featureId: string | number): RegionDisplayDetails | null {
    return this.displayData.get(featureId) || null;
  }
}
