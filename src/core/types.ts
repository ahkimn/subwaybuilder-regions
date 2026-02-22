// --- Statistics Types --- //

import type { LightMode } from '../map/styles';
import { DEFAULT_REGIONS_SETTINGS } from './storage/defaults';
import type { RegionsSettings } from './storage/types';

export const MODE_ORDER: (keyof ModeShare)[] = [
  'transit',
  'driving',
  'walking',
  'unknown',
] as const;
export type ModeKey = (typeof MODE_ORDER)[number];
export const MODE_LABEL: Record<ModeKey, string> = {
  transit: 'Transit',
  driving: 'Driving',
  walking: 'Walking',
  unknown: 'Unknown',
};

export type ModeShare = {
  transit: number; // Number of commuters using transit
  driving: number; // Number of commuters driving
  walking: number; // Number of commuters walking
  unknown: number; // Number of commuters with uncalculated mode choice
};

export const ModeShare = {
  createEmpty(): ModeShare {
    return {
      transit: 0,
      driving: 0,
      walking: 0,
      unknown: 0,
    };
  },
  add(a: ModeShare, b: ModeShare): ModeShare {
    return {
      transit: a.transit + b.transit,
      driving: a.driving + b.driving,
      walking: a.walking + b.walking,
      unknown: a.unknown + b.unknown,
    };
  },
  addInPlace(target: ModeShare, source: ModeShare): ModeShare {
    target.transit += source.transit;
    target.driving += source.driving;
    target.walking += source.walking;
    target.unknown += source.unknown;
    return target;
  },
  total(modeShare: ModeShare): number {
    return (
      modeShare.transit +
      modeShare.driving +
      modeShare.walking +
      modeShare.unknown
    );
  },
  totalOrUndefined(modeShare: ModeShare | undefined): number | undefined {
    return (modeShare && this.total(modeShare)) || undefined;
  },
  share(modeShare: ModeShare, mode: keyof ModeShare): number {
    const total = this.total(modeShare);
    if (total === 0) {
      return 0;
    }
    return modeShare[mode] / total;
  },
  ofMode(mode: keyof ModeShare, modeShare: ModeShare): ModeShare {
    return {
      transit: mode === 'transit' ? modeShare.transit : 0,
      driving: mode === 'driving' ? modeShare.driving : 0,
      walking: mode === 'walking' ? modeShare.walking : 0,
      unknown: mode === 'unknown' ? modeShare.unknown : 0,
    };
  },
};

// --- State Types --- //

export enum DatasetStatus {
  Unloaded = 'unloaded',
  Loading = 'loading',
  Loaded = 'loaded',
  Error = 'error',
}

export type UIStyle = {
  lightMode: LightMode;
};

export class UIState {
  cityCode: string | null = null;
  lastInjectedCity: string | null = null;
  activeSelection: RegionSelection | null = null;
  style: UIStyle = { lightMode: 'dark' };
  settings: RegionsSettings = { ...DEFAULT_REGIONS_SETTINGS };

  get isActive(): boolean {
    return this.cityCode !== null && this.activeSelection !== null;
  }
}

export type RegionSelection = {
  datasetIdentifier: string;
  featureId: string | number;
};

export const RegionSelection = {
  isEqual(a: RegionSelection | null, b: RegionSelection | null): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return (
      a.datasetIdentifier === b.datasetIdentifier && a.featureId === b.featureId
    );
  },
};

// --- Dataset Types --- //
export type DatasetSource = {
  type: 'static' | 'user';
  dataPath: string; // relative path of Dataset from mod serve or user data directory
  writable: boolean; // whether or not the data can be overwritten by the user
};

// Commute type is the origin -> destination pair for a commute
export const CommuteType = {
  WorkToHome: 'WorkToHome',
  HomeToWork: 'HomeToWork',
  // Extend to leisure travel (e.g. Home to Leisure, Leisure to Home), etc. in the future
} as const satisfies Record<string, string>;

export type CommuteType = (typeof CommuteType)[keyof typeof CommuteType];

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

// --- Display Types --- //

export type RouteBulletType = 'circle' | 'square' | 'triangle' | 'diamond';

export type RouteDisplayParams = {
  id: string; // route ID
  bullet: string; // Display name of the route's bullet icon, used for map display
  color: string; // Color to use for displaying the route on the map, in hex code
  textColor: string; // Color to use for text labels for the route, in hex code
  shape: RouteBulletType; // Shape to use for displaying the route on the map
};

export type RegionDemandData = {
  demandPointIds: Set<string>; // IDs of demand points in the region
  populationIds: Set<string>; // IDs of population groups who either live or work in the region (or both)

  demandPoints: number; // number of demand points in the region
  residents: number; // number of residents in the region
  workers: number; // number of workers in the region

  metadata?: RegionGameMetadata; // metadata
};

// TODO (Minor Feature 1): Add this information to the demand data detail structure
export enum SpecialDemandType {
  Airport = 'AIR',
  Workplace = 'WRK',
  University = 'UNI',
}

export const SpecialDemandRegex = new RegExp(
  `^(${Object.values(SpecialDemandType).join('|')})_(.+)$`,
);
