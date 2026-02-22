import type React from 'react';
import { type createElement, type useEffect, type useState } from 'react';

import type { RegionDatasetRegistry } from '../../../core/registry/RegionDatasetRegistry';
import type { RegionsStorage } from '../../../core/storage/RegionsStorage';
import type { ModdingAPI } from '../../../types/modding-api-v1';
import { getNextSortState } from '../shared/helpers';
import type { SortState } from '../types';
import {
  DEFAULT_SORT_STATE,
  type InputFieldProperties,
  type LabelProperties,
  SortDirection,
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
    const [searchTerm, setSearchTerm] = useStateHook('');
    const [sortState, setSortState] = useStateHook<SortState>(() => ({
      ...DEFAULT_SORT_STATE,
      sortDirection: SortDirection.Asc,
    }));

    useEffectHook(() => {
      let mounted = true;
      void storage.initialize().then((loaded) => {
        if (mounted) {
          setSettings(loaded);
        }
      });

      const unsubscribe = storage.listen((nextSettings) => {
        setSettings(nextSettings);
      });

      return () => {
        mounted = false;
        unsubscribe();
      };
    }, []);

    const datasetRows: SettingsDatasetRow[] = Array.from(
      datasetRegistry.datasets.values(),
    ).map((dataset) => ({
      cityCode: dataset.cityCode,
      datasetId: dataset.id,
      displayName: dataset.displayName,
      expectedSize: dataset.expectedSize > 0 ? dataset.expectedSize : null,
      status: dataset.status,
    }));

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
        .refreshStaticRegistryCache()
        .then((count) => {
          api.ui.showNotification(
            `[Regions] Refreshed local registry cache (${count} dataset${count === 1 ? '' : 's'})`,
            'success',
          );
        })
        .catch((error) => {
          console.error(
            '[Regions] Failed to refresh local registry cache',
            error,
          );
          api.ui.showNotification(
            '[Regions] Failed to refresh local registry cache. Check logs for details.',
            'error',
          );
        })
        .finally(() => {
          setIsRefreshingRegistry(false);
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
          })
        : null,
    ]);
  };
}
