import type { RegistryCacheEntry, RegistryOrigin } from '@shared/dataset-index';

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
