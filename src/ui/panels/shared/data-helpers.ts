import { CommuteType, type CommuteType as CommuteTypeType, ModeShare } from '../../../core/types';
import { CommuterDimension } from '../info/types';


// Helper function aggregate the existing mode share by distance buckets into larger buckets of a specified size to enforce a specific number of buckets for display purposes
export function bucketDistanceBreakdownModeShare(
  modeShareByDistance: Map<number, ModeShare>,
  bucketSizeKm: number,
  bucketCount: number): {
    modeShareByBucketStartKm: Map<string | number, ModeShare>;
    bucketSizeKm: number;
    orderedBucketIds: Array<string | number>;
  } {

  // All data above the final bucket will be sent to an "overflow" bucket
  const overflowBucketStartKm = bucketSizeKm * bucketCount;
  const overflowBucketId = `${overflowBucketStartKm}+`;
  const modeShareByBucketStartKm = new Map<string | number, ModeShare>();

  modeShareByDistance.forEach((modeShare, bucketStartKm) => {
    const bucketId: string | number = bucketStartKm >= overflowBucketStartKm
      ? overflowBucketId
      : Math.floor(bucketStartKm / bucketSizeKm) * bucketSizeKm;
    const existing = modeShareByBucketStartKm.get(bucketId);
    if (existing) {
      ModeShare.addInPlace(existing, modeShare);
      return;
    }
    modeShareByBucketStartKm.set(
      bucketId,
      ModeShare.add(ModeShare.createEmpty(), modeShare)
    );
  });

  // Calculate the sorted order of new buckets for display, with overflow bucket appearing last
  const numericBucketIds = Array.from(modeShareByBucketStartKm.keys())
    .filter((bucketId): bucketId is number => typeof bucketId === 'number')
    .sort((a, b) => a - b);
  const orderedBucketIds: Array<string | number> = [...numericBucketIds];
  if (modeShareByBucketStartKm.has(overflowBucketId)) {
    orderedBucketIds.push(overflowBucketId);
  }

  return {
    modeShareByBucketStartKm,
    bucketSizeKm,
    orderedBucketIds,
  };
}

// Helper function to format bucket labels for display, e.g. "0-1km", "1-2km", "10km+"
export function formatDistanceBreakdownUnitName(
  bucketStartKmOrOverflowId: string | number,
  bucketSizeKm: number): string {
  if (typeof bucketStartKmOrOverflowId === 'string') {
    if (bucketStartKmOrOverflowId.endsWith('+')) {
      return `${bucketStartKmOrOverflowId.slice(0, -1)}km+`;
    }
    return `${bucketStartKmOrOverflowId}km`;
  }
  const bucketStartKm = bucketStartKmOrOverflowId;
  const bucketEndKm = bucketStartKm + bucketSizeKm;
  return `${bucketStartKm}-${bucketEndKm}km`;
} export function getBreakdownSortOrder(
  dimension: CommuterDimension,
  unitId: string | number): number | null {
  if (dimension !== CommuterDimension.CommuteLength &&
    dimension !== CommuterDimension.CommuteHour) {
    return null;
  }
  if (typeof unitId === 'number') return unitId;
  if (typeof unitId === 'string' && unitId.endsWith('+')) {
    return Number.parseFloat(unitId);
  }
  return null;
}

export function bucketHourlyBreakdownModeShare(
  modeShareByCommuteTypeByHour: Map<CommuteTypeType, Map<number, ModeShare>>,
  bucketSizeMinutes: number,
  maxBucketCount: number): {
    modeShareByBucketStartMinutes: Map<string | number, ModeShare>;
    modeShareByCommuteTypeByBucketStartMinutes: Map<
      string | number, Map<string | number, ModeShare>
    >;
    orderedBucketIds: Array<string | number>;
  } {
  const maxBucketStartMinutes = (maxBucketCount - 1) * bucketSizeMinutes;
  const modeShareByBucketStartMinutes = new Map<string | number, ModeShare>();
  const modeShareByCommuteTypeByBucketStartMinutes = new Map<
    string | number,
    Map<string | number, ModeShare>
  >();

  modeShareByCommuteTypeByHour.forEach((modeShareByHour, commuteType) => {
    const modeShareByBucketStart = new Map<string | number, ModeShare>();
    modeShareByHour.forEach((modeShare, minuteOfDay) => {
      const clampedMinute = Math.max(0, Math.min(minuteOfDay, 1439));
      const bucketStart = Math.min(
        Math.floor(clampedMinute / bucketSizeMinutes) * bucketSizeMinutes,
        maxBucketStartMinutes
      );
      const existingBucketModeShare = modeShareByBucketStart.get(bucketStart);
      if (existingBucketModeShare) {
        ModeShare.addInPlace(existingBucketModeShare, modeShare);
      } else {
        modeShareByBucketStart.set(bucketStart, ModeShare.add(
          ModeShare.createEmpty(),
          modeShare
        ));
      }

      const aggregateBucketModeShare = modeShareByBucketStartMinutes.get(bucketStart);
      if (aggregateBucketModeShare) {
        ModeShare.addInPlace(aggregateBucketModeShare, modeShare);
      } else {
        modeShareByBucketStartMinutes.set(bucketStart, ModeShare.add(
          ModeShare.createEmpty(),
          modeShare
        ));
      }
    });

    modeShareByCommuteTypeByBucketStartMinutes.set(
      commuteType,
      modeShareByBucketStart
    );
  });

  const orderedBucketIds: Array<string | number> = Array.from(
    modeShareByBucketStartMinutes.keys()
  )
    .filter((bucketId): bucketId is number => typeof bucketId === 'number')
    .sort((a, b) => a - b);

  return {
    modeShareByBucketStartMinutes,
    modeShareByCommuteTypeByBucketStartMinutes,
    orderedBucketIds,
  };
}

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
  bucketSizeMinutes: number): string {
  if (typeof bucketStartMinutes !== 'number') return String(bucketStartMinutes);
  const bucketEndMinutes = Math.min(bucketStartMinutes + bucketSizeMinutes, 1440);
  return `${formatMinuteOfDay(bucketStartMinutes)}-${formatMinuteOfDay(bucketEndMinutes)}`;
}

