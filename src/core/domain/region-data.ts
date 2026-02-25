import type { CommuteType, ModeShare } from './commuters';
import type { RouteDisplayParams } from './route-display';

export type RegionCommuterSummaryData = {
  residentModeShare: ModeShare; // Mode share for all commuters living in the region, regardless of where they work
  workerModeShare: ModeShare; // Mode share for all commuters working in the region, regardless of where they live
  averageResidentCommuteDistance: number | null; // Average commute distance for commuters living in the region, in kilometers
  averageWorkerCommuteDistance: number | null; // Average commute distance for commuters working in the region, in kilometers
  metadata: RegionGameMetadata; // metadata
};

export type RegionCommuterDetailsData = {
  residentModeShareByRegion: Map<string | number, ModeShare>; // region ID to mode share for commuters living in the region
  workerModeShareByRegion: Map<string | number, ModeShare>; // region ID to mode share for commuters working in the region

  /* For hourly mode share breakdown, the map key is the departure-time bucket in minutes from midnight.
    - For both residents / workers, this is the departure time from home for HomeToWork trips and the departure time from work for WorkToHome trips.
    - Example with 60-minute buckets: 1200 -> 20:00. Example with 30-minute buckets: 1230 -> 20:30.
  */
  residentModeSharesByHour: Map<CommuteType, Map<number, ModeShare>>; // minute-of-day bucket to mode share for commuters living in the region by type of commute
  workerModeSharesByHour: Map<CommuteType, Map<number, ModeShare>>; // minute-of-day bucket to mode share for commuters working in the region by type of commute

  residentModeShareByCommuteDistance: Map<number, ModeShare>; // commute distance bucket to mode share for commuters living in the region
  workerModeShareByCommuteDistance: Map<number, ModeShare>; // commute distance bucket to mode share for commuters working in the region

  metadata: RegionGameMetadata; // metadata
};

export type RegionInfraData = {
  stations: Map<string, string>; // Map of station IDs to station names within region
  tracks: Map<string, number>; // Map of trackIDs to their lengths within the region (in kilometers)
  trackLengths: Map<string, number>; // Length of track segments per type within the region (in kilometers)
  routes: Set<string>; // Set of routeIDs that have at least one station within the region
  routeDisplayParams: Map<string, RouteDisplayParams>; // Map of route IDs to display parameters for the route

  metadata?: RegionGameMetadata; // metadata

  // Potential future data fields:
  /*
    odStationRidership: number; // Total O/D ridership for all stations in the region
    totalStationRidership: number; // Total ridership for all stations in the region, including transfers
  */
};

export type RegionGameMetadata = {
  lastUpdate: number; // in-game timestamp (in seconds) of the last data update for the region
  dirty: boolean; // whether the region's data has been marked dirty and is in need of an update
};

export type RegionGameData = {
  readonly datasetId: string; // ID of the dataset this region belongs to
  readonly featureId: string | number; // ID of the feature in the dataset's boundary data

  readonly fullName: string; // full name of the region
  readonly displayName: string; // name to display for the region, equivalent to full name if no abbreviated name exists
  readonly unitTypes: {
    singular: string; // singular form of the unit name
    plural?: string; // plural form of the unit name
  };

  readonly area: number | null; // area of the region in square kilometers
  readonly gameArea: number | null; // area of the region within the game's playable area in square kilometers
  readonly realPopulation: number | null; // real-world population if available
  demandData?: RegionDemandData; // demand data for the region, dynamically updated
  commuterSummary?: RegionCommuterSummaryData; // commuter summary data for the region, dynamically updated
  commuterDetails?: RegionCommuterDetailsData; // commuter detailed data for the region, dynamically updated
  infraData?: RegionInfraData; // infrastructure data for the region, dynamically updated
};

export const RegionDataType = {
  CommuterSummary: 'CommuterSummary',
  CommuterDetails: 'CommuterDetails',
  Infra: 'Infra',
  Demand: 'Demand',
} as const satisfies Record<string, string>;

export type RegionDataType =
  (typeof RegionDataType)[keyof typeof RegionDataType];

export const RegionGameData = {
  isPopulated(regionData: RegionGameData): boolean {
    return (regionData.demandData?.demandPoints ?? 0) > 0;
  },
};

export type RegionDemandData = {
  demandPointIds: Set<string>; // IDs of demand points in the region
  populationIds: Set<string>; // IDs of population groups who either live or work in the region (or both)

  demandPoints: number; // number of demand points in the region
  residents: number; // number of residents in the region
  workers: number; // number of workers in the region

  metadata?: RegionGameMetadata; // metadata
};
export enum DatasetStatus {
  Unloaded = 'unloaded',
  Loading = 'loading',
  Loaded = 'loaded',
  Error = 'error'
}
