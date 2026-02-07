// --- Geometry --- //
export type BoundaryBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};


// --- Statistics Types --- //

export type ModeShare = {
  transit: number; // Number of commuters using transit
  driving: number; // Number of commuters driving
  walking: number; // Number of commuters walking
  unknown: number; // Number of commuters with uncalculated mode choice
}

export const ModeShare = {
  add(a: ModeShare, b: ModeShare): ModeShare {
    return {
      transit: a.transit + b.transit,
      driving: a.driving + b.driving,
      walking: a.walking + b.walking,
      unknown: a.unknown + b.unknown,
    }
  },
  total(modeShare: ModeShare): number {
    return modeShare.transit + modeShare.driving + modeShare.walking + modeShare.unknown;
  },
  share(modeShare: ModeShare, mode: keyof ModeShare): number {
    const total = this.total(modeShare);
    if (total === 0) {
      return 0;
    }
    return modeShare[mode] / total;
  }
}

// --- State Types --- //

export enum DatasetStatus {
  Unloaded = 'unloaded',
  Loading = 'loading',
  Loaded = 'loaded',
  Error = 'error',
}


export class UIState {
  cityCode: string | null = null;
  lastInjectedCity: string | null = null;
  activeDatasetId: string | null = null;
  activeFeatureId: string | number | null = null;

  isActive(): boolean {
    return this.cityCode !== null &&
      this.activeDatasetId !== null &&
      this.activeFeatureId !== null;
  }
}




// --- Dataset Types --- //
export type DatasetSource = {
  type: 'static' | 'user';
  dataPath: string; // relative path of Dataset from mod serve or user data directory
  writable: boolean; // whether or not the data can be overwritten by the user
}

export type RegionCommuterData = {
  residentModeShare: ModeShare; // Mode share for all commuters living in the region, regardless of where they work
  workerModeShare: ModeShare; // Mode share for all commuters working in the region, regardless of where they live

  residentModeShareByRegion: Map<string, ModeShare>; // region name to mode share for commuters living in the region
  workerModeShareByRegion: Map<string, ModeShare>; // region name to mode share for commuters working in the region

  metadata?: RegionGameMetadata; // metadata

  // Potential future data fields:
  /*
    averageCommuteDistance: number; // in kilometers
    averageCommuteTime: number; // in in-game minutes

    homeArrivalTimes: Map<number, number>; // hour of day to number of arrivals
    homeDepartureTimes: Map<number, number>; // hour of day to number of departures

    workArrivalTimes: Map<number, number>; // hour of day to number of arrivals
    workDepartureTimes: Map<number, number>; // hour of day to number of departures
  */
}

export type RegionInfraData = {
  stations: Map<string, string>; // Map of station IDs to station names within region
  tracks: Set<string>; // Set of trackIDs that pass through the region
  trackLengths: Map<string, number>; // Length of track segments per type within the region (in kilometers)
  routes: Set<string>; // Set of routeIDs that have at least one station within the region
  routeDisplayParams: Map<string, RouteDisplayParams>; // Map of route IDs to display parameters for the route

  metadata?: RegionGameMetadata; // metadata

  // Potential future data fields:
  /*
    odStationRidership: number; // Total O/D ridership for all stations in the region
    totalStationRidership: number; // Total ridership for all stations in the region, including transfers
  */
}

export type RegionGameMetadata = {
  lastUpdate: number; // in-game timestamp (in seconds) of the last data update for the region
  dirty: boolean; // whether the region's data has been marked dirty and is in need of an update
}

export type RegionGameData = {
  readonly datasetId: string; // ID of the dataset this region belongs to
  readonly featureId: string | number; // ID of the feature in the dataset's boundary data

  readonly displayName: string; // name to display for the region
  readonly unitNames: {
    singular: string; // singular form of the unit name
    plural: string;   // plural form of the unit name
  };

  readonly area: number; // area of the region in square kilometers
  readonly gameArea: number; // area of the region within the game's playable area in square kilometers
  readonly realPopulation: number | null; // real-world population if available
  demandData?: RegionDemandData; // demand data for the region, dynamically updated
  commuterData?: RegionCommuterData; // commuter data for the region, dynamically updated
  infraData?: RegionInfraData; // infrastructure data for the region, dynamically updated
}


// --- Display Types --- //

export type RouteBulletType = 'circle' | 'square' | 'triangle' | 'diamond';

export type RouteDisplayParams = {
  id: string; // route ID
  bullet: string; // Display name of the route's bullet icon, used for map display
  color: string; // Color to use for displaying the route on the map, in hex code
  textColor: string; // Color to use for text labels for the route, in hex code
  shape: RouteBulletType; // Shape to use for displaying the route on the map
}

export type RegionDemandData = {
  demandPointIds: Set<string>; // IDs of demand points in the region
  populationIds: Set<string>; // IDs of population groups who either live or work in the region (or both)

  demandPoints: number; // number of demand points in the region
  residents: number; // number of residents in the region
  workers: number;  // number of workers in the region

  metadata?: RegionGameMetadata; // metadata
}

// TODO (Minor Feature 1): Add this information to the demand data detail structure
export enum SpecialDemandType {
  Airport = 'AIR',
  Workplace = 'WRK',
  University = 'UNI'
}

export const SpecialDemandRegex = new RegExp(
  `^(${Object.values(SpecialDemandType).join('|')})_(.+)$`
);



