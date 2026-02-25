import type { RegistryCacheEntry } from '@shared/dataset-index';
import {
  CATALOG_STATIC_COUNTRIES,
  resolveCountryDatasets,
} from '@shared/datasets/catalog';
import type React from 'react';

import type { RegionDataset } from '@/core/datasets/RegionDataset';
import { resolveRuntimePlatform } from '@/core/storage/helpers';
import type { City } from '@/types/cities';
import { getGameReact } from '@/ui/react/get-game-react';

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
  type PendingFlagKey,
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


    const fetchErrors = buildFetchErrors({
      hasCity: Boolean(state.fetch.params.cityCode),
      hasCountry: state.fetch.params.countryCode !== null,
      hasDatasets: state.fetch.params.datasetIds.length > 0,
      hasBBox: state.fetch.params.bbox !== null,
    });
    const fetchCommand =
      fetchErrors.length > 0
        ? ''
        : formatFetchCommand({
          platform: runtimePlatform,
          params: state.fetch.params,
          relativeModPath,
          outPath: buildDefaultFetchOutPath(runtimePlatform, relativeModPath),
        });

    type RunAsyncOperationParams = {
      key: PendingFlagKey;
      errorMessage?: string;
      notifyOnError?: string;
      task: () => Promise<void>;
    };

    const runAsyncOperation = (params: RunAsyncOperationParams) => {
      dispatch({ type: 'set_pending_flag', key: params.key, value: true });

      void params
        .task()
        .catch((error) => {
          if (params.errorMessage) {
            console.error(params.errorMessage, error);
          }
          if (params.notifyOnError) {
            api.ui.showNotification(params.notifyOnError, 'error');
          }
        })
        .finally(() => {
          dispatch({
            type: 'set_pending_flag',
            key: params.key,
            value: false,
          });
        });
    };

    const updateSettings = (patch: { showUnpopulatedRegions?: boolean }) => {
      runAsyncOperation({
        key: 'updating',
        errorMessage: '[Regions] Failed to update settings.',
        task: () =>
          storage.updateSettings(patch).then((nextSettings) => {
            dispatch({ type: 'settings_updated', settings: nextSettings });
          }),
      });
    };

    /**
     * Initiate registry refresh
     */
    const refreshRegistry = () => {
      runAsyncOperation({
        key: 'refreshingRegistry',
        errorMessage: '[Regions] Failed to refresh registry. Check logs for details.',
        notifyOnError:
          '[Regions] Failed to refresh registry. Check logs for details.',
        task: () =>
          datasetRegistry
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
            }),
      });
    };

    /**
     * Clear non-served registry entries that are unusable by the user (due to either being missing on the local file system or being tied to a no longer existing city)
     */
    const clearMissingEntries = () => {
      runAsyncOperation({
        key: 'clearingMissing',
        errorMessage:
          '[Regions] Failed to clear missing registry entries. Check logs for details.',
        notifyOnError:
          '[Regions] Failed to clear missing registry entries. Check logs for details.',
        task: () =>
          storage
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
            }),
      });
    };

    useEffectHook(() => {
      const cityCode = state.fetch.params.cityCode;
      if (!cityCode) {
        dispatch({
          type: 'set_fetch_params',
          params: { bbox: null },
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
              type: 'set_fetch_params',
              params: { bbox: null },
            });
            return;
          }

          dispatch({
            type: 'set_fetch_params',
            params: {
              bbox: {
                west: bbox[0].toFixed(4),
                south: bbox[1].toFixed(4),
                east: bbox[2].toFixed(4),
                north: bbox[3].toFixed(4),
              },
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
            type: 'set_fetch_params',
            params: { bbox: null },
          });
        });

      return () => {
        cancelled = true;
      };
    }, [state.fetch.params.cityCode]);

    const onFetchCityCodeChange = (cityCode: string) => {
      const nextCity = knownCitiesByCode.get(cityCode);
      const countryCode = resolveCityCountryCode(nextCity);
      const allowedDatasetIds = resolveCountryDatasets(countryCode, {
        onlineOnly: true,
      }).map((dataset) => dataset.datasetId);

      dispatch({
        type: 'set_fetch_params',
        params: {
          cityCode,
          countryCode: null,
          datasetIds: [],
          bbox: null,
        },
      });
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
      if (!fetchCommand) {
        return;
      }
      void window.navigator.clipboard
        .writeText(fetchCommand)
        .then(() => {
          api.ui.showNotification('[Regions] Script command copied!', 'success');
        })
        .catch((error) => {
          console.error('[Regions] Failed to copy fetch command.', error);
          api.ui.showNotification(
            '[Regions] Failed to copy command to clipboard. Please manually copy the generated command.',
            'error',
          );
        });
    };

    const onOpenModsFolder = () => {
      dispatch({ type: 'set_is_opening_mods_folder', value: true });
      void storage
        .openModsFolder()
        .catch((error) => {
          console.error('[Regions] Failed to open mods folder.', error);
          api.ui.showNotification('[Regions] Failed to open mods folder.', 'error');
        })
        .finally(() => {
          dispatch({ type: 'set_is_opening_mods_folder', value: false });
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
            fetchParams: state.fetch.params,
            errors: fetchErrors,
            command: fetchCommand,
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
        matchingOriginEntry?.fileSizeMB ??
        (origin === 'served' ? dataset.fileSizeMB : undefined),
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
