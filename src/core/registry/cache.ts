import type { RegistryCacheEntry, RegistryOrigin } from '@shared/dataset-index';
import { resolveCountryDatasetOrder } from '@shared/datasets/catalog';

export const LOCAL_ORIGIN_PRECEDENCE: Record<RegistryOrigin, number> = {
  static: 0,
  dynamic: 1,
  user: 2,
} as const;

export function toLogicalDatasetKey(
  entry: Pick<RegistryCacheEntry, 'cityCode' | 'datasetId'>,
): string {
  return `${entry.cityCode}::${entry.datasetId}`;
}

export function mergeLocalRegistryEntries(
  entries: RegistryCacheEntry[],
): RegistryCacheEntry[] {
  const deduped = new Map<string, RegistryCacheEntry>();

  for (const entry of entries) {
    const key = toLogicalDatasetKey(entry);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, entry);
      continue;
    }

    const existingPrecedence = LOCAL_ORIGIN_PRECEDENCE[existing.origin];
    const incomingPrecedence = LOCAL_ORIGIN_PRECEDENCE[entry.origin];
    if (incomingPrecedence >= existingPrecedence) {
      deduped.set(key, entry);
    }
  }

  return Array.from(deduped.values());
}

// Helper to return a deterministic ordering for datasets for the same city based on the country's statically defined dataset ordering.
// Within the cache, insertion order is not guaranteed to be consistent as the user may request datasets in any order
export function sortEntriesByCountryDatasetOrder<
  T extends { datasetId: string; country?: string | null },
>(entries: T[]): T[] {
  if (entries.length <= 1) {
    return entries;
  }

  const country = entries.find((entry) => entry.country)?.country;
  // Country is not always available (it was introduced into the Cache in 0.4.1) so we maintain this fallback to avoid errors
  if (!country) {
    return entries;
  }

  const datasetOrder = resolveCountryDatasetOrder(country);
  if (datasetOrder.length === 0) {
    return entries;
  }

  const orderIndex = new Map<string, number>(
    datasetOrder.map((datasetId, index) => [datasetId, index]),
  );

  return [...entries].sort((a, b) => {
    const aOrder = orderIndex.get(a.datasetId);
    const bOrder = orderIndex.get(b.datasetId);
    if (aOrder == null || bOrder == null) {
      return 0;
    }
    return aOrder - bOrder;
  });
}

export function canonicalizeLocalRegistryEntries(
  entries: RegistryCacheEntry[],
): {
  entries: RegistryCacheEntry[];
  changed: boolean;
} {
  const mergedEntries = mergeLocalRegistryEntries(entries);
  const changed =
    mergedEntries.length !== entries.length ||
    mergedEntries.some((entry, index) => entry !== entries[index]);
  return {
    entries: mergedEntries,
    changed,
  };
}
