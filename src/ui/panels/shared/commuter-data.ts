import {
  AVAILABLE_BUCKET_SIZES_KM,
  AVAILABLE_BUCKET_SIZES_MINUTES,
  DISTANCE_BUCKET_COUNT,
} from '@/core/constants';
import {
  CommuteType,
  ModeShare,
  type RegionCommuterDetailsData,
} from '@/core/types';

import {
  type CommuterBreakdownData,
  CommuterDimension,
  CommuterDirection,
  type CommutersViewState,
} from '../info/types';

const DEFAULT_DISTANCE_BUCKET_SIZE_KM = AVAILABLE_BUCKET_SIZES_KM[2];
const DEFAULT_HOUR_BUCKET_SIZE_MINUTES = AVAILABLE_BUCKET_SIZES_MINUTES[1];
export const HOURLY_SANKEY_FLOW_DISPLAY_COUNT = Math.round(
  (24 * 60) / DEFAULT_HOUR_BUCKET_SIZE_MINUTES,
);

// --- Derived Data Helpers --- //
export function resolveCommuterBreakdownData(
  commuterDetailsData: RegionCommuterDetailsData,
  viewState: CommutersViewState,
  resolveRegionName: (unitId: string | number) => string,
): CommuterBreakdownData {
  const isOutbound = viewState.direction === CommuterDirection.Outbound;
  switch (viewState.dimension) {
    case CommuterDimension.CommuteLength: {
      const distanceModeShareByBucketStartKm = isOutbound
        ? commuterDetailsData.residentModeShareByCommuteDistance
        : commuterDetailsData.workerModeShareByCommuteDistance;
      const distanceBreakdown = bucketDistanceBreakdownModeShare(
        distanceModeShareByBucketStartKm,
        DEFAULT_DISTANCE_BUCKET_SIZE_KM,
        DISTANCE_BUCKET_COUNT,
      );
      return {
        modeShareByBreakdownUnit: distanceBreakdown.modeShareByBucket,
        resolveBreakdownUnitName: (unitId) =>
          formatDistanceBreakdownUnitName(
            unitId,
            distanceBreakdown.bucketSizeKm,
          ),
      };
    }
    case CommuterDimension.CommuteHour: {
      const sourceModeShareByHour = isOutbound
        ? commuterDetailsData.residentModeSharesByHour
        : commuterDetailsData.workerModeSharesByHour;
      const hourBucketSizeMinutes = DEFAULT_HOUR_BUCKET_SIZE_MINUTES;
      const hourlyBreakdown = bucketHourlyBreakdownModeShare(
        sourceModeShareByHour,
        hourBucketSizeMinutes,
        HOURLY_SANKEY_FLOW_DISPLAY_COUNT,
      );

      return {
        modeShareByBreakdownUnit: hourlyBreakdown.modeShareByBucket,
        resolveBreakdownUnitName: (unitId) =>
          formatHourlyBreakdownUnitName(unitId, hourBucketSizeMinutes),
        sourceModeShareByBreakdownUnit:
          hourlyBreakdown.modeShareByTypeAndBucket,
      };
    }
    case CommuterDimension.Region:
    default:
      return {
        modeShareByBreakdownUnit: isOutbound
          ? commuterDetailsData.residentModeShareByRegion
          : commuterDetailsData.workerModeShareByRegion,
        resolveBreakdownUnitName: resolveRegionName,
      };
  }
}

// Helper function aggregate the existing mode share by distance buckets into larger buckets of a specified size to enforce a specific number of buckets for display purposes
export function bucketDistanceBreakdownModeShare(
  modeShareByDistance: Map<number, ModeShare>,
  bucketSizeKm: number,
  bucketCount: number,
): {
  modeShareByBucket: Map<string | number, ModeShare>;
  bucketSizeKm: number;
  orderedBucketIds: Array<string | number>;
} {
  // All data above the final bucket will be sent to an "overflow" bucket
  const overflowBucketStartKm = bucketSizeKm * bucketCount;
  const overflowBucketId = `${overflowBucketStartKm}+`;
  const modeShareByBucket = new Map<string | number, ModeShare>();

  modeShareByDistance.forEach((modeShare, bucketStartKm) => {
    const bucketId: string | number =
      bucketStartKm >= overflowBucketStartKm
        ? overflowBucketId
        : Math.floor(bucketStartKm / bucketSizeKm) * bucketSizeKm;
    const existing = modeShareByBucket.get(bucketId);
    if (existing) {
      ModeShare.addInPlace(existing, modeShare);
      return;
    }
    modeShareByBucket.set(
      bucketId,
      ModeShare.add(ModeShare.createEmpty(), modeShare),
    );
  });

  // Calculate the sorted order of new buckets for display, with overflow bucket appearing last
  const numericBucketIds = Array.from(modeShareByBucket.keys())
    .filter((bucketId): bucketId is number => typeof bucketId === 'number')
    .sort((a, b) => a - b);
  const orderedBucketIds: Array<string | number> = [...numericBucketIds];
  if (modeShareByBucket.has(overflowBucketId)) {
    orderedBucketIds.push(overflowBucketId);
  }

  return {
    modeShareByBucket: modeShareByBucket,
    bucketSizeKm,
    orderedBucketIds,
  };
}

// Helper function to format bucket labels for display, e.g. "0-1km", "1-2km", "10km+"
export function formatDistanceBreakdownUnitName(
  bucketId: string | number,
  bucketSizeKm: number,
): string {
  if (typeof bucketId === 'string') {
    if (bucketId.endsWith('+')) {
      return `${bucketId.slice(0, -1)}km+`;
    }
    return `${bucketId}km`;
  }
  const bucketStartKm = bucketId;
  const bucketEndKm = bucketStartKm + bucketSizeKm;
  return `${bucketStartKm}-${bucketEndKm}km`;
}

export function getBreakdownSortOrder(
  dimension: CommuterDimension,
  unitId: string | number,
): number | null {
  if (
    dimension !== CommuterDimension.CommuteLength &&
    dimension !== CommuterDimension.CommuteHour
  ) {
    return null;
  }
  if (typeof unitId === 'number') return unitId;
  if (typeof unitId === 'string' && unitId.endsWith('+')) {
    return Number.parseFloat(unitId);
  }
  return null;
}

export function bucketHourlyBreakdownModeShare(
  modeShareByHourAndType: Map<CommuteType, Map<number, ModeShare>>,
  bucketSizeMinutes: number,
  maxBucketCount: number,
): {
  modeShareByBucket: Map<string | number, ModeShare>;
  modeShareByTypeAndBucket: Map<
    string | number,
    Map<string | number, ModeShare>
  >;
  orderedBucketIds: Array<string | number>;
} {
  const maxBucketStartMinutes = (maxBucketCount - 1) * bucketSizeMinutes;
  const modeShareByBucket = new Map<string | number, ModeShare>();
  const modeShareByTypeAndBucket = new Map<
    string | number,
    Map<string | number, ModeShare>
  >();

  modeShareByHourAndType.forEach((modeShareByHour, commuteType) => {
    const modeShareByBucketStart = new Map<string | number, ModeShare>();
    modeShareByHour.forEach((modeShare, minuteOfDay) => {
      const clampedMinute = Math.max(0, Math.min(minuteOfDay, 1439));
      const bucketStart = Math.min(
        Math.floor(clampedMinute / bucketSizeMinutes) * bucketSizeMinutes,
        maxBucketStartMinutes,
      );
      const existingBucketModeShare = modeShareByBucketStart.get(bucketStart);
      if (existingBucketModeShare) {
        ModeShare.addInPlace(existingBucketModeShare, modeShare);
      } else {
        modeShareByBucketStart.set(
          bucketStart,
          ModeShare.add(ModeShare.createEmpty(), modeShare),
        );
      }

      const aggregateBucketModeShare = modeShareByBucket.get(bucketStart);
      if (aggregateBucketModeShare) {
        ModeShare.addInPlace(aggregateBucketModeShare, modeShare);
      } else {
        modeShareByBucket.set(
          bucketStart,
          ModeShare.add(ModeShare.createEmpty(), modeShare),
        );
      }
    });

    modeShareByTypeAndBucket.set(commuteType, modeShareByBucketStart);
  });

  const orderedBucketIds: Array<string | number> = Array.from(
    modeShareByBucket.keys(),
  )
    .filter((bucketId): bucketId is number => typeof bucketId === 'number')
    .sort((a, b) => a - b);

  return {
    modeShareByBucket: modeShareByBucket,
    modeShareByTypeAndBucket: modeShareByTypeAndBucket,
    orderedBucketIds,
  };
}

export function resolveOrderedUnitIds(
  dimension: CommuterDimension,
  modeShareByBreakdownUnit: Map<string | number, ModeShare>,
): Array<string | number> | undefined {
  if (dimension === CommuterDimension.Region) return undefined;
  const orderedUnitIds = Array.from(modeShareByBreakdownUnit.keys()).sort(
    (a, b) => {
      const aSort = getBreakdownSortOrder(dimension, a);
      const bSort = getBreakdownSortOrder(dimension, b);
      if (aSort !== null && bSort !== null && aSort !== bSort) {
        return aSort - bSort;
      }
      if (aSort !== null && bSort === null) return -1;
      if (aSort === null && bSort !== null) return 1;
      return String(a).localeCompare(String(b));
    },
  );
  return orderedUnitIds.length > 0 ? orderedUnitIds : undefined;
}

// --- Naming Helpers --- //
export function formatCommuteTypeBreakdownUnitName(
  commuteType: string | number,
): string {
  if (commuteType === CommuteType.HomeToWork) return 'Home \u2192 Work';
  if (commuteType === CommuteType.WorkToHome) return 'Work \u2192 Home';
  return String(commuteType);
}

function formatMinuteOfDay(minutes: number): string {
  const clampedMinutes = Math.max(0, Math.min(minutes, 1440));
  const hour = Math.floor(clampedMinutes / 60);
  const minute = clampedMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatHourlyBreakdownUnitName(
  bucketStartMinutes: string | number,
  bucketSizeMinutes: number,
): string {
  if (typeof bucketStartMinutes !== 'number') return String(bucketStartMinutes);
  const bucketEndMinutes = Math.min(
    bucketStartMinutes + bucketSizeMinutes,
    1440,
  );
  return `${formatMinuteOfDay(bucketStartMinutes)}-${formatMinuteOfDay(bucketEndMinutes)}`;
}

export function resolveValueUnitLabel(
  dimension: CommuterDimension,
): 'commuters' | 'commutes' {
  return dimension === CommuterDimension.CommuteHour ? 'commutes' : 'commuters';
}

export function resolveSourceUnitName(
  dimension: CommuterDimension,
  unitId: string | number,
): string {
  if (dimension === CommuterDimension.CommuteHour) {
    return formatCommuteTypeBreakdownUnitName(unitId);
  }
  return String(unitId);
}

export function resolveBreakdownSourceLabel(
  viewState: CommutersViewState,
): string {
  switch (viewState.dimension) {
    case CommuterDimension.CommuteLength:
      return 'Distance';
    case CommuterDimension.CommuteHour:
      return 'Departure Hour';
    case CommuterDimension.Region:
    default:
      return viewState.direction === CommuterDirection.Outbound
        ? 'Destination'
        : 'Origin';
  }
}
