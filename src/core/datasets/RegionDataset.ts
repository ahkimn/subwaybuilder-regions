import type { DatasetIndexEntry } from '@shared/dataset-index';
import * as turf from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

import type { DemandData } from '../../types/modding-api-v1';
import {
  DEFAULT_UNIT_LABELS,
  LAYER_PREFIX,
  SOURCE_PREFIX,
  UNASSIGNED_REGION_ID,
  UNKNOWN_VALUE_DISPLAY,
} from '../constants';
import {
  DatasetInvalidFeatureTypeError,
  DatasetMissingDataLayerError,
} from '../errors';
import {
  isCoordinateWithinFeature,
  isPolygonFeature,
} from '../geometry/helpers';
import type {
  DatasetSource,
  RegionCommuterDetailsData,
  RegionCommuterSummaryData,
  RegionDemandData,
  RegionGameData,
  RegionInfraData,
} from '../types';
import { DatasetStatus, RegionGameData as RegionGameDataUtils } from '../types';
import { fetchGeoJSON } from '../utils';

export class RegionDataset {
  readonly id: string; // name (e.x. "districts", "bua", "my_zones")
  readonly cityCode: string; // city identifier (e.x. "LON", "MAN", "BOS")
  readonly source: DatasetSource;

  // Optional, mutable display names for UI
  displayName: string;

  readonly unitLabelSingular: string;
  readonly unitLabelPlural: string;
  readonly metadataSource: string;
  readonly expectedSize: number;

  // Static data store properties (boundaries / labels)
  boundaryData: GeoJSON.FeatureCollection | null = null;
  labelData: GeoJSON.FeatureCollection | null = null;

  // Dynamic game-specific data store, keyed by feature ID
  // Partially populated on load, augmented with demand/commuter/infra data from game state
  readonly gameData: Map<string | number, RegionGameData> = new Map();
  // Map of demand point ID to set of associated region feature IDs for quick lookup when building demand data
  // Populations may have more than one associated region if they live and work in different regions
  readonly regionDemandPointMap: Map<string, string | number> = new Map();
  readonly regionNameMap: Map<string | number, string> = new Map();

  status: DatasetStatus = DatasetStatus.Unloaded;
  isUserEdited: boolean = false;

  constructor(
    indexEntry: DatasetIndexEntry,
    cityCode: string,
    source: DatasetSource,
  ) {
    this.id = indexEntry.datasetId;
    this.cityCode = cityCode;
    this.source = source;
    this.displayName = indexEntry.displayName || indexEntry.datasetId;

    this.unitLabelSingular =
      indexEntry.unitSingular || DEFAULT_UNIT_LABELS.singular;
    this.unitLabelPlural = indexEntry.unitPlural || DEFAULT_UNIT_LABELS.plural;
    this.metadataSource = indexEntry.source || 'Unknown';
    this.expectedSize = Number.isFinite(indexEntry.size) ? indexEntry.size : 0;
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

  private validateBoundarySize(): void {
    if (!this.boundaryData) {
      return;
    }

    const loadedSize = this.boundaryData.features.length;
    if (loadedSize !== this.expectedSize) {
      console.warn(
        `[Regions] Dataset size mismatch for ${this.id} in ${this.cityCode}: expected ${this.expectedSize}, loaded ${loadedSize}`,
      );
    }
  }

  private unloadData(): void {
    this.boundaryData = null;
    this.labelData = null;
  }

  async load(): Promise<boolean> {
    console.log(
      `[Regions] Loading dataset: ${this.id} for city ${this.cityCode} (${this.metadataSource})`,
    );

    if (this.status === DatasetStatus.Loaded) {
      return true;
    }

    if (this.status === DatasetStatus.Loading) {
      return false;
    }

    this.status = DatasetStatus.Loading;

    try {
      await this.loadBoundaryData();
      this.validateBoundarySize();
      this.buildLabelData();
      this.populateStaticData();
      this.status = DatasetStatus.Loaded;
      this.isUserEdited = false;
      return true;
    } catch (err) {
      console.warn(
        `[Regions] Failed to load dataset: ${this.id} for city ${this.cityCode}: `,
        err,
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
      console.warn(
        `Attempted to mark read-only dataset: ${this.id} for city ${this.cityCode} as edited.`,
      );
    }
  }

  static getLayerPrefix(dataset: RegionDataset): string {
    return `${LAYER_PREFIX}-${dataset.cityCode}-${dataset.id}`;
  }

  static getSourcePrefix(dataset: RegionDataset): string {
    return `${SOURCE_PREFIX}-${dataset.cityCode}-${dataset.id}`;
  }

  static getIdentifier(dataset: RegionDataset): string {
    return `${dataset.cityCode}-${dataset.id}`;
  }

  updateWithCommuterSummaryData(
    updatedData: Map<string | number, RegionCommuterSummaryData>,
  ): void {
    updatedData.forEach((commuterSummaryData, featureId) => {
      this.getRegionGameData(featureId)!.commuterSummary = commuterSummaryData;
    });
  }

  updateWithCommuterDetailsData(
    featureId: string | number,
    commuterDetailsData: RegionCommuterDetailsData,
  ): void {
    this.getRegionGameData(featureId)!.commuterDetails = commuterDetailsData;
  }

  updateWithInfraData(
    featureId: string | number,
    infraData: RegionInfraData,
  ): void {
    this.getRegionGameData(featureId)!.infraData = infraData;
  }

  private assignDemandPoints(
    demandData: DemandData,
  ): Map<string | number, RegionDemandData> {
    if (!this.boundaryData) {
      throw new DatasetMissingDataLayerError(this.id, 'boundaryData');
    }
    if (!this.gameData.size) {
      throw new DatasetMissingDataLayerError(this.id, 'gameData');
    }

    // Tear down existing demand point associations .
    this.regionDemandPointMap.clear();

    const accumulator = this.boundaryData.features.map((feature) => {
      if (!isPolygonFeature(feature))
        throw new DatasetInvalidFeatureTypeError(this.id, feature);
      const featureId: string | number = feature.properties?.ID!;

      return {
        featureId: featureId,
        feature: feature as Feature<Polygon | MultiPolygon>,
        bbox: turf.bbox(feature),
        demandPointIds: new Set<string>(),
        populationIds: new Set<string>(),
        residents: 0,
        workers: 0,
      };
    });

    const unassignedDemandPointIds = new Set<string>();

    for (const [id, point] of demandData.points) {
      const [lng, lat] = point.location;

      for (const region of accumulator) {
        if (!isCoordinateWithinFeature(lat, lng, region.feature, region.bbox)) {
          continue;
        }

        region.residents += point.residents;
        region.workers += point.jobs;

        for (const popId of point.popIds) {
          region.populationIds.add(popId);
        }

        region.demandPointIds.add(id);
        this.regionDemandPointMap.set(id, region.featureId);
        break;
      }

      // If no region included the demand point, assign it to the UNASSIGNED region and maintain a record of it in the point => region map for commuter calculations
      if (!this.regionDemandPointMap.has(id)) {
        unassignedDemandPointIds.add(id);
        // TODO (Issue 1) We need to be careful to not let the user click into the UNASSIGNED region and cause errors within UI components as there will be no boundary/label data for it
        this.regionDemandPointMap.set(id, UNASSIGNED_REGION_ID);
        this.regionNameMap.set(UNASSIGNED_REGION_ID, UNKNOWN_VALUE_DISPLAY);
      }
    }

    if (unassignedDemandPointIds.size > 0) {
      console.warn(
        `Unassigned demand points in dataset ${this.id}:`,
        unassignedDemandPointIds,
      );
    }

    return new Map(
      accumulator.map((region) => {
        return [
          region.featureId,
          {
            demandPointIds: region.demandPointIds,
            populationIds: region.populationIds,
            demandPoints: region.demandPointIds.size,
            residents: region.residents,
            workers: region.workers,
          } as RegionDemandData,
        ];
      }),
    );
  }

  updateWithDemandData(demandData: DemandData): void {
    const results = this.assignDemandPoints(demandData);
    for (const [featureId, demandData] of results) {
      this.getRegionGameData(featureId)!.demandData = demandData;
    }
    this.applyExistsDemandProperties();
  }

  private applyExistsDemandProperties(): void {
    const applyToCollection = (
      featureCollection: GeoJSON.FeatureCollection | null,
    ) => {
      if (!featureCollection) return;

      for (const feature of featureCollection.features) {
        const featureId: string | number = feature.properties?.ID!;
        const gameData = this.getRegionGameData(featureId);
        const existsDemand = gameData
          ? RegionGameDataUtils.isPopulated(gameData)
          : false;

        feature.properties = {
          ...feature.properties,
          EXISTS_DEMAND: existsDemand,
        };
      }
    };

    applyToCollection(this.boundaryData);
    applyToCollection(this.labelData);
  }

  private populateStaticData(): void {
    this.boundaryData!.features.forEach((feature) => {
      const featureId: string | number = feature.properties?.ID!;
      const fullName = feature.properties?.NAME!;
      const displayName: string = feature.properties?.DISPLAY_NAME || fullName;
      const featureUnitType: string | undefined = feature.properties?.UNIT_TYPE;

      this.regionNameMap.set(featureId, displayName);
      this.gameData.set(featureId, {
        datasetId: this.id,
        featureId: featureId,
        fullName: fullName,
        displayName: displayName,
        unitTypes: {
          singular: featureUnitType || this.unitLabelSingular,
          plural: this.unitLabelPlural,
        },
        area: feature.properties?.TOTAL_AREA,
        gameArea: feature.properties?.AREA_WITHIN_BBOX,
        realPopulation: feature.properties?.POPULATION || null,
      });
    });

    this.applyExistsDemandProperties();
  }

  buildLabelData(): void {
    if (!this.boundaryData) {
      throw new Error(
        `Cannot build label data with unloaded boundary data for dataset: ${this.id}`,
      );
    }

    const labelFeatures = new Array<GeoJSON.Feature>();

    this.boundaryData.features.forEach((feature) => {
      const { LAT, LNG, NAME, DISPLAY_NAME, ID } = feature.properties ?? {};

      if (DISPLAY_NAME == null && NAME == null) {
        console.warn(
          `\tFeature missing NAME and DISPLAY_NAME property, cannot build label: ${feature.id}`,
        );
        return;
      }

      if (LAT == null || LNG == null) {
        console.warn(
          `\tFeature with name: ${NAME} missing LAT/LONG properties, cannot build label.`,
        );
        return;
      }

      const labelFeature: GeoJSON.Feature = {
        type: 'Feature',
        id: feature.id, // share ID with boundary feature
        geometry: {
          type: 'Point',
          coordinates: [LNG, LAT],
        },
        properties: {
          NAME: DISPLAY_NAME || NAME,
          ID: ID,
        },
      };

      labelFeatures.push(labelFeature);
    });

    this.labelData = {
      type: 'FeatureCollection',
      features: labelFeatures,
    };
  }

  getRegionGameData(featureId: string | number): RegionGameData | null {
    return this.gameData.get(featureId) || null;
  }
}
