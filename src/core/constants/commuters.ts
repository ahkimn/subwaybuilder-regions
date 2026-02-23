export const STALE_COMMUTER_DATA_THRESHOLD_SECONDS = 900; // Threshold for considering commuter data stale and in need of refresh, in seconds of in-game time (15 minutes)
export const STALE_INFRA_DATA_THRESHOLD_SECONDS = 604800; // Threshold for considering infra data stale and in need of refresh, in seconds of in-game time (weekly)

export const REGIONS_INFO_UPDATE_GAME_INTERVAL = 900; // 15 in-game minutes
export const REGIONS_INFO_UPDATE_REAL_INTERVAL = 3; // 3 real-world seconds
export const UPDATE_ON_DEMAND_CHANGE = true; // If true, commuter refresh checks are triggered by onDemandChange instead of polling

export const DEFAULT_CHUNK_SIZE = 100; // Default loop chunk size for time-sliced data processing

// TODO: (Feature) add as config option
export const SANKEY_FLOW_DISPLAY_COUNT = 10; // Number of flows to display in sankey diagrams by default, excluding "Other" and "Unassigned" aggregate categories
export const SANKEY_LABEL_FLOW_SYNC = true; // Whether the labels of entries within a Sankey diagram should always be rendered on the right side of nodes, or if they should be conditionally rendered on the left side depending on the direction of flow
export const DISTANCE_BUCKET_COUNT = 10; // Number of buckets to divide commute distances into display for in chart elements. Anything above the max distance (defined as bucket size * bucket count) will be grouped into an "xkm+" category
export const AVAILABLE_BUCKET_SIZES_KM = [1, 2, 5, 10] as const; // Allowable size of commute distance buckets in kilometers
export const AVAILABLE_BUCKET_SIZES_MINUTES = [60, 120, 180, 240, 360] as const;
export const DEFAULT_TABLE_ROWS = 12;

export const DEFAULT_DISTANCE_BUCKET_SIZE_KM = AVAILABLE_BUCKET_SIZES_KM[2];
export const DEFAULT_HOUR_BUCKET_SIZE_MINUTES = AVAILABLE_BUCKET_SIZES_MINUTES[1];
export const HOURLY_SANKEY_FLOW_DISPLAY_COUNT = Math.round(
  (24 * 60) / DEFAULT_HOUR_BUCKET_SIZE_MINUTES,
);
