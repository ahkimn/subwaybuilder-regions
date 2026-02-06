export type BoundaryBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type DatasetSource = {
  type: 'static' | 'user';
  dataPath: string; // relative path of Dataset from mod serve or user data directory
  writable: boolean; // whether or not the data can be overwritten by the user
}

export enum DatasetStatus {
  Unloaded = 'unloaded',
  Loading = 'loading',
  Loaded = 'loaded',
  Error = 'error',
}

// TODO: Add this information to the demand data detail structure
export enum SpecialDemandType {
  Airport = 'AIR',
  Workplace = 'WRK',
  University = 'UNI'
}

export const SpecialDemandRegex = new RegExp(
  `^(${Object.values(SpecialDemandType).join('|')})_(.+)$`
);

export type RegionDemandDetails = {
  demandPointIds: Set<string>; // IDs of demand points in the region
  populationIds: Set<string>; // IDs of population groups in the region

  demandPoints: number; // number of demand points in the region
  residents: number; // number of residents in the region
  workers: number;  // number of workers in the region
}

export type RegionDisplayDetails = {
  readonly displayName: string; // name to display for the region
  readonly area: number; // area of the region in square kilometers
  readonly gameArea: number; // area of the region within the game's playable area in square kilometers
  readonly realPopulation: number | null; // real-world population if available
  demandDetails: RegionDemandDetails | null; // demand details for the region, dynamically updated
}
