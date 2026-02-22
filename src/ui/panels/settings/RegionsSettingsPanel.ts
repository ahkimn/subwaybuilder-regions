import type { RegistryCacheEntry } from '@shared/dataset-index';
import type React from 'react';
import { type createElement, type useEffect, type useState } from 'react';

import type { RegionDataset } from '../../../core/datasets/RegionDataset';
import type { RegionDatasetRegistry } from '../../../core/registry/RegionDatasetRegistry';
import type { RegionsStorage } from '../../../core/storage/RegionsStorage';
import type { ModdingAPI } from '../../../types/modding-api-v1';
import { getNextSortState } from '../shared/helpers';
import {
  DEFAULT_SORT_STATE,
  type InputFieldProperties,
  type LabelProperties,
  SortDirection,
  type SortState,
  type SwitchProperties,
} from '../types';
import {
  filterSettingsRows,
  renderSettingsEntry,
  renderSettingsOverlay,
  resolveRegistrySortConfig,
  type SettingsDatasetRow,
  sortSettingsRows,
} from './render';

type SettingsMenuComponentParams = {
  api: ModdingAPI;
  storage: RegionsStorage;
  datasetRegistry: RegionDatasetRegistry;
};

export function RegionsSettingsPanel({
  api,
  storage,
  datasetRegistry,
}: SettingsMenuComponentParams): () => React.ReactNode {
  const h = api.utils.React.createElement as typeof createElement;
  const useStateHook = api.utils.React.useState as typeof useState;
  const useEffectHook = api.utils.React.useEffect as typeof useEffect;
  const Fragment = api.utils.React.Fragment;
  const Input = api.utils.components
    .Input as React.ComponentType<InputFieldProperties>;
  const Switch = api.utils.components
    .Switch as React.ComponentType<SwitchProperties>;
  const Label = api.utils.components
    .Label as React.ComponentType<LabelProperties>;

  return function RegionsSettingsMenuComponent() {
    const [isOpen, setIsOpen] = useStateHook<boolean>(false);
    const [settings, setSettings] = useStateHook(() => storage.getSettings());
    const [isUpdating, setIsUpdating] = useStateHook(false);
    const [isRefreshingRegistry, setIsRefreshingRegistry] = useStateHook(false);
    const [isClearingMissing, setIsClearingMissing] = useStateHook(false);
    const [, setRegistryRevision] = useStateHook(0);
    const [cachedRegistryEntries, setCachedRegistryEntries] = useStateHook<
      RegistryCacheEntry[]
    >([]);
    const [searchTerm, setSearchTerm] = useStateHook('');
    const [sortState, setSortState] = useStateHook<SortState>(() => ({
      ...DEFAULT_SORT_STATE,
      sortDirection: SortDirection.Asc,
    }));

    const reloadCachedRegistry = () => {
      return storage.loadStoredRegistry().then((storedRegistry) => {
        setCachedRegistryEntries(storedRegistry?.entries ?? []);
      });
    };

    useEffectHook(() => {
      let mounted = true;
      void storage.initialize().then((loaded) => {
        if (mounted) {
          setSettings(loaded);
        }
      });
      void reloadCachedRegistry();

      const unsubscribe = storage.listen((nextSettings) => {
        setSettings(nextSettings);
      });
      const unsubscribeRegistry = datasetRegistry.listen(() => {
        setRegistryRevision((current) => current + 1);
      });

      return () => {
        mounted = false;
        unsubscribe();
        unsubscribeRegistry();
      };
    }, []);

    const knownCityCodes = new Set(
      api.utils.getCities().map((city) => city.code),
    );
    const datasetRows = buildSettingsDatasetRows(
      datasetRegistry.datasets,
      cachedRegistryEntries,
      knownCityCodes,
    );

    const filteredRows = filterSettingsRows(datasetRows, searchTerm);
    const sortedRows = sortSettingsRows(filteredRows, sortState);

    const updateSettings = (patch: { showUnpopulatedRegions?: boolean }) => {
      setIsUpdating(true);
      void storage
        .updateSettings(patch)
        .then((nextSettings) => {
          setSettings(nextSettings);
        })
        .finally(() => {
          setIsUpdating(false);
        });
    };

    const refreshRegistry = () => {
      setIsRefreshingRegistry(true);
      void datasetRegistry
        .build(() => {
          console.warn('[Regions] Failed to load dataset index from server');
        })
        .then(({ servedCount, localCount }) => {
          if (servedCount > 0 && localCount > 0) {
            api.ui.showNotification(
              `[Regions] Refreshed registry: ${servedCount} served + ${localCount} local datasets.`,
              'success',
            );
          } else if (servedCount > 0) {
            api.ui.showNotification(
              `[Regions] Refreshed registry: ${servedCount} served dataset${servedCount === 1 ? '' : 's'}.`,
              'success',
            );
          } else {
            api.ui.showNotification(
              `[Regions] Refreshed registry: ${localCount} local dataset${localCount === 1 ? '' : 's'}.`,
              'success',
            );
          }
          return reloadCachedRegistry();
        })
        .catch((error) => {
          console.error('[Regions] Failed to refresh registry', error);
          api.ui.showNotification(
            '[Regions] Failed to refresh registry. Check logs for details.',
            'error',
          );
        })
        .finally(() => {
          setIsRefreshingRegistry(false);
        });
    };

    const clearMissingEntries = () => {
      setIsClearingMissing(true);
      void storage
        .loadStoredRegistry()
        .then((storedRegistry) => {
          if (!storedRegistry) {
            return 0;
          }

          const beforeCount = storedRegistry.entries.length;
          const retainedEntries = storedRegistry.entries.filter((entry) => {
            return resolveCachedEntryIssue(entry, knownCityCodes) === null;
          });

          const removedCount = beforeCount - retainedEntries.length;
          if (removedCount <= 0) {
            return 0;
          }

          return storage
            .saveRegistry({
              updatedAt: Date.now(),
              entries: retainedEntries,
            })
            .then(() => removedCount);
        })
        .then((removedCount) => {
          if (removedCount > 0) {
            api.ui.showNotification(
              `[Regions] Cleared ${removedCount} missing registry entr${removedCount === 1 ? 'y' : 'ies'}.`,
              'success',
            );
          } else {
            api.ui.showNotification(
              '[Regions] No missing registry entries found.',
              'info',
            );
          }
          return reloadCachedRegistry();
        })
        .catch((error) => {
          console.error(
            '[Regions] Failed to clear missing registry entries',
            error,
          );
          api.ui.showNotification(
            '[Regions] Failed to clear missing registry entries. Check logs for details.',
            'error',
          );
        })
        .finally(() => {
          setIsClearingMissing(false);
        });
    };

    return h(Fragment, null, [
      renderSettingsEntry(h, () => setIsOpen(true)),
      isOpen
        ? renderSettingsOverlay(h, useStateHook, Input, Switch, Label, {
            settings,
            isUpdating,
            searchTerm,
            sortState,
            rows: sortedRows,
            onClose: () => setIsOpen(false),
            onSearchTermChange: setSearchTerm,
            onSortChange: (columnIndex: number) => {
              setSortState((current) =>
                getNextSortState<SettingsDatasetRow>(
                  current,
                  columnIndex,
                  resolveRegistrySortConfig,
                ),
              );
            },
            onToggleShowUnpopulatedRegions: (nextValue: boolean) => {
              updateSettings({ showUnpopulatedRegions: nextValue });
            },
            onRefreshRegistry: refreshRegistry,
            isRefreshingRegistry,
            onClearMissing: clearMissingEntries,
            isClearingMissing,
          })
        : null,
    ]);
  };
}

function buildSettingsDatasetRows(
  datasets: Map<string, RegionDataset>,
  cachedEntries: RegistryCacheEntry[],
  knownCityCodes: Set<string>,
): SettingsDatasetRow[] {
  const rows = new Map<string, SettingsDatasetRow>();
  const cacheByDatasetKey = new Map<string, RegistryCacheEntry[]>();

  cachedEntries.forEach((entry) => {
    const datasetKey = `${entry.cityCode}::${entry.datasetId}`;
    const existing = cacheByDatasetKey.get(datasetKey) ?? [];
    existing.push(entry);
    cacheByDatasetKey.set(datasetKey, existing);
  });

  datasets.forEach((dataset) => {
    const datasetKey = `${dataset.cityCode}::${dataset.id}`;
    const matchingCachedEntries = cacheByDatasetKey.get(datasetKey) ?? [];
    const inferredOrigin: 'served' | 'static' | 'dynamic' = isServedDataset(
      dataset,
    )
      ? 'served'
      : dataset.source.type === 'user'
        ? 'dynamic'
        : 'static';
    const matchingOriginEntry = matchingCachedEntries.find(
      (entry) => entry.origin === inferredOrigin,
    );

    rows.set(`${dataset.cityCode}:${dataset.id}:${inferredOrigin}`, {
      rowKey: `${dataset.cityCode}:${dataset.id}:${inferredOrigin}`,
      cityCode: dataset.cityCode,
      datasetId: dataset.id,
      displayName: dataset.displayName,
      origin: inferredOrigin,
      fileSizeMB:
        inferredOrigin === 'served'
          ? null
          : (matchingOriginEntry?.fileSizeMB ?? null),
      issue: !knownCityCodes.has(dataset.cityCode)
        ? 'missing_city'
        : matchingOriginEntry
          ? resolveCachedEntryIssue(matchingOriginEntry, knownCityCodes)
          : null,
    });
  });

  cachedEntries.forEach((entry) => {
    const rowKey = `${entry.cityCode}:${entry.datasetId}:${entry.origin}`;
    if (rows.has(rowKey)) {
      return;
    }
    const issue = resolveCachedEntryIssue(entry, knownCityCodes);

    rows.set(rowKey, {
      rowKey,
      cityCode: entry.cityCode,
      datasetId: entry.datasetId,
      displayName: entry.displayName,
      origin: entry.origin,
      fileSizeMB: entry.fileSizeMB,
      issue,
    });
  });

  return Array.from(rows.values());
}

function resolveCachedEntryIssue(
  entry: RegistryCacheEntry,
  knownCityCodes: Set<string>,
): 'missing_file' | 'missing_city' | null {
  if (!knownCityCodes.has(entry.cityCode)) {
    return 'missing_city';
  }
  if (!entry.isPresent) {
    return 'missing_file';
  }
  return null;
}

function isServedDataset(dataset: RegionDataset): boolean {
  return !dataset.dataPath.startsWith('file:///');
}
