import type { RegistryCacheEntry } from '@shared/dataset-index';
import type React from 'react';
import {
  type createElement,
  type useEffect,
  type useReducer,
  type useState,
} from 'react';

import type { RegionDataset } from '../../../core/datasets/RegionDataset';
import type { RegionDatasetRegistry } from '../../../core/registry/RegionDatasetRegistry';
import type { RegionsStorage } from '../../../core/storage/RegionsStorage';
import type { DatasetOrigin } from '../../../core/types';
import type { ModdingAPI } from '../../../types/api';
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

type PendingFlags = {
  updating: boolean;
  refreshingRegistry: boolean;
  clearingMissing: boolean;
};

type RegionsSettingsState = {
  isOpen: boolean;
  settings: ReturnType<RegionsStorage['getSettings']>;
  cachedRegistryEntries: RegistryCacheEntry[];
  searchTerm: string;
  sortState: SortState;
  registryRevision: number;
  pending: PendingFlags;
  error: string | null;
};

type RegionsSettingsAction =
  | { type: 'open_overlay' }
  | { type: 'close_overlay' }
  | { type: 'set_search_term'; searchTerm: string }
  | { type: 'set_sort_state'; sortState: SortState }
  | {
      type: 'settings_loaded';
      settings: ReturnType<RegionsStorage['getSettings']>;
    }
  | {
      type: 'settings_updated';
      settings: ReturnType<RegionsStorage['getSettings']>;
    }
  | { type: 'registry_entries_loaded'; entries: RegistryCacheEntry[] }
  | { type: 'registry_revision_bumped' }
  | { type: 'update_settings_started' }
  | { type: 'update_settings_finished' }
  | { type: 'refresh_registry_started' }
  | { type: 'refresh_registry_finished' }
  | { type: 'clear_missing_started' }
  | { type: 'clear_missing_finished' }
  | { type: 'operation_failed'; message: string };

function createInitialSettingsState(
  storage: RegionsStorage,
): RegionsSettingsState {
  return {
    isOpen: false,
    settings: storage.getSettings(),
    cachedRegistryEntries: [],
    searchTerm: '',
    sortState: {
      ...DEFAULT_SORT_STATE,
      sortDirection: SortDirection.Asc,
    },
    registryRevision: 0,
    pending: {
      updating: false,
      refreshingRegistry: false,
      clearingMissing: false,
    },
    error: null,
  };
}

function regionsSettingsReducer(
  state: RegionsSettingsState,
  action: RegionsSettingsAction,
): RegionsSettingsState {
  switch (action.type) {
    // UI actions
    case 'open_overlay':
      return { ...state, isOpen: true };
    case 'close_overlay':
      return { ...state, isOpen: false };
    case 'set_search_term':
      return { ...state, searchTerm: action.searchTerm };
    case 'set_sort_state':
      return { ...state, sortState: action.sortState };

    // Store/registry sync actions
    case 'settings_loaded':
    case 'settings_updated':
      return { ...state, settings: action.settings };
    case 'registry_entries_loaded':
      return { ...state, cachedRegistryEntries: action.entries };
    case 'registry_revision_bumped':
      return { ...state, registryRevision: state.registryRevision + 1 };

    // Async lifecycle actions
    case 'update_settings_started':
      return {
        ...state,
        pending: { ...state.pending, updating: true },
        error: null,
      };
    case 'update_settings_finished':
      return {
        ...state,
        pending: { ...state.pending, updating: false },
      };
    case 'refresh_registry_started':
      return {
        ...state,
        pending: { ...state.pending, refreshingRegistry: true },
        error: null,
      };
    case 'refresh_registry_finished':
      return {
        ...state,
        pending: { ...state.pending, refreshingRegistry: false },
      };
    case 'clear_missing_started':
      return {
        ...state,
        pending: { ...state.pending, clearingMissing: true },
        error: null,
      };
    case 'clear_missing_finished':
      return {
        ...state,
        pending: { ...state.pending, clearingMissing: false },
      };
    case 'operation_failed':
      return { ...state, error: action.message };
    default:
      return state;
  }
}

export function RegionsSettingsPanel({
  api,
  storage,
  datasetRegistry,
}: SettingsMenuComponentParams): () => React.ReactNode {
  const h = api.utils.React.createElement as typeof createElement;
  const useStateHook = api.utils.React.useState as typeof useState;
  const useReducerHook = api.utils.React.useReducer as typeof useReducer;
  const useEffectHook = api.utils.React.useEffect as typeof useEffect;
  const Fragment = api.utils.React.Fragment;
  const Input = api.utils.components
    .Input as React.ComponentType<InputFieldProperties>;
  const Switch = api.utils.components
    .Switch as React.ComponentType<SwitchProperties>;
  const Label = api.utils.components
    .Label as React.ComponentType<LabelProperties>;

  return function RegionsSettingsMenuComponent() {
    const [state, dispatch] = useReducerHook(
      regionsSettingsReducer,
      storage,
      createInitialSettingsState,
    );

    const reloadCachedRegistry = () => {
      return storage.loadStoredRegistry().then((storedRegistry) => {
        dispatch({
          type: 'registry_entries_loaded',
          entries: storedRegistry?.entries ?? [],
        });
      });
    };

    useEffectHook(() => {
      let mounted = true;
      void storage.initialize().then((loaded) => {
        if (mounted) {
          dispatch({ type: 'settings_loaded', settings: loaded });
        }
      });
      void reloadCachedRegistry();

      const unsubscribe = storage.listen((nextSettings) => {
        dispatch({ type: 'settings_updated', settings: nextSettings });
      });
      const unsubscribeRegistry = datasetRegistry.listen(() => {
        dispatch({ type: 'registry_revision_bumped' });
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
      state.cachedRegistryEntries,
      knownCityCodes,
    );

    const filteredRows = filterSettingsRows(datasetRows, state.searchTerm);
    const sortedRows = sortSettingsRows(filteredRows, state.sortState);

    const updateSettings = (patch: { showUnpopulatedRegions?: boolean }) => {
      dispatch({ type: 'update_settings_started' });
      void storage
        .updateSettings(patch)
        .then((nextSettings) => {
          dispatch({ type: 'settings_updated', settings: nextSettings });
        })
        .catch((error) => {
          dispatch({
            type: 'operation_failed',
            message: '[Regions] Failed to update settings.',
          });
          console.error('[Regions] Failed to update settings', error);
        })
        .finally(() => {
          dispatch({ type: 'update_settings_finished' });
        });
    };

    const refreshRegistry = () => {
      dispatch({ type: 'refresh_registry_started' });
      void datasetRegistry
        .build(() => {
          console.warn('[Regions] Failed to load dataset index from server');
        })
        .then(({ servedCount, localCount }) => {
          if (servedCount > 0 || localCount > 0) {
            api.ui.showNotification(
              `[Regions] Refreshed registry: ${servedCount} served + ${localCount} local datasets.`,
              'success',
            );
          }
          return reloadCachedRegistry();
        })
        .catch((error) => {
          dispatch({
            type: 'operation_failed',
            message:
              '[Regions] Failed to refresh registry. Check logs for details.',
          });
          console.error('[Regions] Failed to refresh registry', error);
          api.ui.showNotification(
            '[Regions] Failed to refresh registry. Check logs for details.',
            'error',
          );
        })
        .finally(() => {
          dispatch({ type: 'refresh_registry_finished' });
        });
    };

    const clearMissingEntries = () => {
      dispatch({ type: 'clear_missing_started' });
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
          dispatch({
            type: 'operation_failed',
            message:
              '[Regions] Failed to clear missing registry entries. Check logs for details.',
          });
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
          dispatch({ type: 'clear_missing_finished' });
        });
    };

    return h(Fragment, null, [
      renderSettingsEntry(h, () => dispatch({ type: 'open_overlay' })),
      state.isOpen
        ? renderSettingsOverlay(h, useStateHook, Input, Switch, Label, {
            settings: state.settings,
            isUpdating: state.pending.updating,
            searchTerm: state.searchTerm,
            sortState: state.sortState,
            rows: sortedRows,
            onClose: () => dispatch({ type: 'close_overlay' }),
            onSearchTermChange: (searchTerm: string) =>
              dispatch({ type: 'set_search_term', searchTerm }),
            onSortChange: (columnIndex: number) => {
              const nextSortState = getNextSortState<SettingsDatasetRow>(
                state.sortState,
                columnIndex,
                resolveRegistrySortConfig,
              );
              dispatch({ type: 'set_sort_state', sortState: nextSortState });
            },
            onToggleShowUnpopulatedRegions: (nextValue: boolean) => {
              updateSettings({ showUnpopulatedRegions: nextValue });
            },
            onRefreshRegistry: refreshRegistry,
            isRefreshingRegistry: state.pending.refreshingRegistry,
            onClearMissing: clearMissingEntries,
            isClearingMissing: state.pending.clearingMissing,
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
    const inferredOrigin: DatasetOrigin = isServedDataset(dataset)
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
