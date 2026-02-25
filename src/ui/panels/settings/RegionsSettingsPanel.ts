import type { RegistryCacheEntry } from '@shared/dataset-index';
import {
  CATALOG_STATIC_COUNTRIES,
  resolveCountryDatasets,
} from '@shared/datasets/catalog';
import type React from 'react';

import type { RegionDataset } from '@/core/datasets/RegionDataset';
import type { City } from '@/types/cities';
import { getGameReact } from '@/ui/react/get-game-react';

import { resolveRuntimePlatform } from '../../../core/storage/helpers';
import { getNextSortState } from '../shared/sort';
import {
  type InputFieldProperties,
  type LabelProperties,
  type SwitchProperties,
} from '../types';
import {
  buildDefaultFetchOutPath,
  buildFetchErrors,
  type FetchCountryCode,
  formatFetchCommand,
  resolveCityCountryCode,
} from './fetch-helpers';
import {
  createInitialSettingsState,
  regionsSettingsReducer,
} from './RegionsSettingsState';
import {
  filterSettingsRows,
  renderSettingsEntry,
  renderSettingsOverlay,
  resolveRegistrySortConfig,
  type SettingsDatasetRow,
  sortSettingsRows,
} from './render';
import { type SettingsMenuComponentParams } from './types';

const DEFAULT_FETCH_PADDING_KM = 10;

export function RegionsSettingsPanel({
  api,
  storage,
  datasetRegistry,
}: SettingsMenuComponentParams): () => React.ReactNode {
  const { h, Fragment, useEffectHook, useReducerHook, useStateHook } =
    getGameReact(api);
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
    const runtimePlatform = resolveRuntimePlatform(state.systemPerformanceInfo);
    const relativeModPath = storage.getResolvedRelativeModPath();

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
          dispatch({
            type: 'set_system_performance_info',
            systemPerformanceInfo: storage.getCachedSystemPerformanceInfo(),
          });
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

    const knownCitiesByCode = new Map<string, City>(
      api.utils.getCities().map((city) => [city.code, city]),
    );
    const knownCityCodes = new Set(knownCitiesByCode.keys());
    const datasetRows = buildSettingsDatasetRows(
      datasetRegistry.datasets,
      state.cachedRegistryEntries,
      knownCitiesByCode,
    );

    const filteredRows = filterSettingsRows(datasetRows, state.searchTerm);
    const sortedRows = sortSettingsRows(filteredRows, state.sortState);
    const fetchableDatasets = resolveCountryDatasets(
      state.fetch.params.countryCode,
      { onlineOnly: true },
    );
    const countryOptions = [...CATALOG_STATIC_COUNTRIES];

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

    /**
     * Initiate registry refresh
     */
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

    /**
     * Clear non-served registry entries that are unusable by the user (due to either being missing on the local file system or being tied to a no longer existing city)
     */
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

    useEffectHook(() => {
      const cityCode = state.fetch.params.cityCode;
      if (!cityCode) {
        dispatch({
          type: 'set_fetch_bbox_fields',
          bbox: null,
        });
        return;
      }

      let cancelled = false;
      void storage
        .buildPaddedDemandBBox(cityCode, DEFAULT_FETCH_PADDING_KM)
        .then((bbox) => {
          if (cancelled) {
            return;
          }

          if (!bbox) {
            dispatch({
              type: 'set_fetch_bbox_fields',
              bbox: null,
            });
            return;
          }

          dispatch({
            type: 'set_fetch_bbox_fields',
            bbox: {
              west: bbox[0].toFixed(4),
              south: bbox[1].toFixed(4),
              east: bbox[2].toFixed(4),
              north: bbox[3].toFixed(4),
            },
          });
        })
        .catch((error) => {
          console.warn(
            '[Regions] Failed to build demand bbox for fetch.',
            error,
          );
          if (cancelled) {
            return;
          }
          dispatch({
            type: 'set_fetch_bbox_fields',
            bbox: null,
          });
        });

      return () => {
        cancelled = true;
      };
    }, [state.fetch.params.cityCode]);

    useEffectHook(() => {
      const params = state.fetch.params;
      const hasCity = Boolean(params.cityCode);
      const hasCountry = params.countryCode !== null;
      const hasDatasets = params.datasetIds.length > 0;
      const hasBBox = params.bbox !== null;

      const errors = buildFetchErrors({
        hasCity,
        hasCountry,
        hasDatasets,
        hasBBox,
      });
      dispatch({ type: 'set_fetch_errors', errors });

      if (errors.length > 0) {
        dispatch({ type: 'set_fetch_command', command: '' });
        return;
      }

      dispatch({
        type: 'set_fetch_command',
        command: formatFetchCommand({
          platform: runtimePlatform,
          params,
          relativeModPath,
          outPath: buildDefaultFetchOutPath(runtimePlatform, relativeModPath),
        }),
      });
    }, [state.fetch.params, runtimePlatform, relativeModPath]);

    const onFetchCityCodeChange = (cityCode: string) => {
      const nextCity = knownCitiesByCode.get(cityCode);
      const countryCode = resolveCityCountryCode(nextCity);
      const allowedDatasetIds = resolveCountryDatasets(countryCode, {
        onlineOnly: true,
      }).map((dataset) => dataset.datasetId);

      dispatch({ type: 'set_fetch_city_code', cityCode });
      dispatch({
        type: 'set_fetch_country_code',
        countryCode,
        allowedDatasetIds,
        isAutoResolved: Boolean(countryCode),
      });
    };

    const onFetchCountryCodeChange = (countryCode: FetchCountryCode | null) => {
      if (state.fetch.isCountryAutoResolved) {
        return;
      }
      const allowedDatasetIds = resolveCountryDatasets(countryCode, {
        onlineOnly: true,
      }).map((dataset) => dataset.datasetId);
      dispatch({
        type: 'set_fetch_country_code',
        countryCode,
        allowedDatasetIds,
        isAutoResolved: false,
      });
    };

    const onCopyFetchCommand = () => {
      if (!state.fetch.command) {
        return;
      }
      dispatch({ type: 'copy_fetch_command_started' });
      // Copy to clipboard
      void window.navigator.clipboard
        .writeText(state.fetch.command)
        .then(() => {
          api.ui.showNotification(
            '[Regions] Script command copied!',
            'success',
          );
        })
        .catch((error) => {
          console.error('[Regions] Failed to copy fetch command.', error);
          api.ui.showNotification(
            '[Regions] Failed to copy command to clipboard. Please manually copy the generated command.',
            'error',
          );
        })
        .finally(() => {
          dispatch({ type: 'copy_fetch_command_finished' });
        });
    };

    const onOpenModsFolder = () => {
      dispatch({ type: 'open_mods_folder_started' });
      void storage
        .openModsFolder()
        .catch((error) => {
          console.error('[Regions] Failed to open mods folder.', error);
          // There's not really a good fallback for an exception here, but at least we can notify the user that it didn't work through a UI toast
          api.ui.showNotification(
            '[Regions] Failed to open mods folder.',
            'error',
          );
        })
        .finally(() => {
          dispatch({ type: 'open_mods_folder_finished' });
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
            fetch: {
              params: state.fetch.params,
              errors: state.fetch.errors,
              command: state.fetch.command,
              isCopying: state.fetch.isCopying,
              isOpeningModsFolder: state.fetch.isOpeningModsFolder,
              isCountryAutoResolved: state.fetch.isCountryAutoResolved,
              cityOptions: Array.from(knownCitiesByCode.values()).map(
                (city) => ({
                  code: city.code,
                  name: city.name,
                }),
              ),
              countryOptions,
              datasets: fetchableDatasets,
              relativeModPath,
              systemPerformanceInfo: state.systemPerformanceInfo,
              onCityCodeChange: onFetchCityCodeChange,
              onCountryCodeChange: onFetchCountryCodeChange,
              onToggleDataset: (datasetId: string) =>
                dispatch({ type: 'toggle_fetch_dataset', datasetId }),
              onCopyCommand: onCopyFetchCommand,
              onOpenModsFolder,
            },
          })
        : null,
    ]);
  };
}

function buildSettingsDatasetRows(
  datasets: Map<string, RegionDataset>,
  cachedEntries: RegistryCacheEntry[],
  knownCitiesByCode: Map<string, City>,
): SettingsDatasetRow[] {
  const rows = new Map<string, SettingsDatasetRow>();
  const cacheByDatasetKey = new Map<string, RegistryCacheEntry[]>();
  const knownCityCodes = new Set(knownCitiesByCode.keys());

  cachedEntries.forEach((entry) => {
    const datasetKey = `${entry.cityCode}::${entry.datasetId}`;
    const existing = cacheByDatasetKey.get(datasetKey) ?? [];
    existing.push(entry);
    cacheByDatasetKey.set(datasetKey, existing);
  });

  // First iterate through built registry datasets to show that all currently registered datasets are represented in the table
  datasets.forEach((dataset) => {
    const datasetKey = `${dataset.cityCode}::${dataset.id}`;
    const matchingCachedEntries = cacheByDatasetKey.get(datasetKey) ?? [];
    const origin = dataset.source.type;
    const matchingOriginEntry = matchingCachedEntries.find(
      (entry) => entry.origin === origin,
    );

    rows.set(`${dataset.cityCode}:${dataset.id}:${origin}`, {
      rowKey: `${dataset.cityCode}:${dataset.id}:${origin}`,
      cityCode: dataset.cityCode,
      cityName: knownCitiesByCode.get(dataset.cityCode)?.name ?? null,
      datasetId: dataset.id,
      displayName: dataset.displayName,
      origin: origin,
      fileSizeMB:
        origin === 'served' ? null : (matchingOriginEntry?.fileSizeMB ?? null),
      issue: !knownCityCodes.has(dataset.cityCode)
        ? 'missing_city'
        : matchingOriginEntry
          ? resolveCachedEntryIssue(matchingOriginEntry, knownCityCodes)
          : null,
    });
  });

  // Then iterate through cached entries to find any datasets that are currently missing from the registry (usually due to their being removed from local file system since they were cached)
  cachedEntries.forEach((entry) => {
    const rowKey = `${entry.cityCode}:${entry.datasetId}:${entry.origin}`;
    if (rows.has(rowKey)) {
      return;
    }
    const issue = resolveCachedEntryIssue(entry, knownCityCodes);

    if (!issue) {
      // If this triggers, there a few potential causes, each of which is worthy of investigation
      // 1) The activte registry failed to load a valid datset that was present in the cached registry
      // 2) The cached registry has been corrupted in some way (e.g. manual edit, or a failed write that resulted in a partial entry being saved)
      console.warn(
        `[Regions] Found cached registry entry with no identifiable issue that missing from the active registry. Entry details: ${JSON.stringify(entry)}`,
      );
    }

    rows.set(rowKey, {
      rowKey,
      cityCode: entry.cityCode,
      cityName: knownCitiesByCode.get(entry.cityCode)?.name ?? null,
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
