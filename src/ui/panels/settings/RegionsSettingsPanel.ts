import type React from 'react';
import { type createElement, type useEffect, type useState } from 'react';

import type { RegionDatasetRegistry } from '../../../core/registry/RegionDatasetRegistry';
import type { RegionsSettingsStore } from '../../../core/settings/RegionsSettingsStore';
import type { ModdingAPI } from '../../../types/modding-api-v1';

type SettingsMenuComponentParams = {
  api: ModdingAPI;
  settingsStore: RegionsSettingsStore;
  datasetRegistry: RegionDatasetRegistry;
};

type DatasetListItem = {
  cityCode: string;
  datasetId: string;
  displayName: string;
  source: string;
  expectedSize: number;
  writable: boolean;
  status: string;
};

export function createSettingsMenuComponent({
  api,
  settingsStore,
  datasetRegistry,
}: SettingsMenuComponentParams): () => React.ReactNode {

  const h = api.utils.React.createElement as typeof createElement;
  const useStateHook = api.utils.React.useState as typeof useState;
  const useEffectHook = api.utils.React.useEffect as typeof useEffect;
  const Fragment = api.utils.React.Fragment;

  return function RegionsSettingsMenuComponent() {
    const [isOpen, setIsOpen] = useStateHook<boolean>(false);
    const [settings, setSettings] = useStateHook(() => settingsStore.get());
    const [isUpdating, setIsUpdating] = useStateHook(false);

    useEffectHook(() => {
      let mounted = true;
      void settingsStore.initialize().then((loaded) => {
        if (mounted) {
          setSettings(loaded);
        }
      });

      const unsubscribe = settingsStore.listen((nextSettings) => {
        setSettings(nextSettings);
      });

      return () => {
        mounted = false;
        unsubscribe();
      };
    }, []);

    const datasetRows: DatasetListItem[] = Array.from(
      datasetRegistry.datasets.values(),
    )
      .map((dataset) => ({
        cityCode: dataset.cityCode,
        datasetId: dataset.id,
        displayName: dataset.displayName,
        source: dataset.metadataSource,
        expectedSize: dataset.expectedSize,
        writable: dataset.isWritable,
        status: dataset.status,
      }))
      .sort((a, b) => {
        const citySort = a.cityCode.localeCompare(b.cityCode);
        if (citySort !== 0) return citySort;
        return a.datasetId.localeCompare(b.datasetId);
      });

    const updateSettings = (patch: {
      showUnpopulatedRegions?: boolean;
    }) => {
      setIsUpdating(true);
      void settingsStore
        .updateSettings(patch)
        .then((nextSettings) => {
          setSettings(nextSettings);
        })
        .finally(() => {
          setIsUpdating(false);
        });
    };

    const renderToggle = (
      key: 'showUnpopulatedRegions',
      label: string,
      description: string,
    ) =>
      h('label', { className: 'flex items-start gap-2 text-sm' }, [
        h('input', {
          key: `${key}-input`,
          type: 'checkbox',
          checked: settings[key],
          disabled: isUpdating,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            const target = event.target;
            updateSettings({ showUnpopulatedRegions: target.checked });
          },
        }),
        h('div', { key: `${key}-text`, className: 'flex flex-col gap-0.5' }, [
          h('span', { className: 'font-medium text-foreground' }, label),
          h('span', { className: 'text-xs text-muted-foreground' }, description),
        ]),
      ]);

    return h(Fragment, null, [
      h('div', { key: 'entry', className: 'flex flex-col gap-1' }, [
        h(
          'button',
          {
            className:
              'inline-flex items-center justify-between gap-2 w-full px-3 py-2 rounded-sm border border-border bg-background hover:bg-accent text-left transition-colors',
            type: 'button',
            onClick: () => setIsOpen(true),
          },
          [
            h('span', { className: 'font-medium text-sm' }, 'Regions Settings'),
            h('span', { className: 'text-xs text-muted-foreground' }, 'Open'),
          ],
        ),
        h(
          'p',
          { className: 'text-xs text-muted-foreground truncate pl-1' },
          'Configure Regions defaults and review available datasets',
        ),
      ]),
      isOpen
        ? h(
          'div',
          {
            key: 'settings-overlay',
            className:
              'absolute inset-0 w-full h-full overflow-auto bg-background/95 backdrop-blur-sm p-4 z-50',
          },
          [
            h('div', { className: 'max-w-5xl mx-auto flex flex-col gap-4' }, [
              h(
                'button',
                {
                  className:
                    'w-fit px-2 py-1 text-sm rounded-sm border border-border bg-background hover:bg-accent',
                  type: 'button',
                  onClick: () => setIsOpen(false),
                },
                'Back',
              ),
              h('div', { className: 'flex flex-col gap-1' }, [
                h('h1', { className: 'text-xl font-semibold' }, 'Regions Settings'),
                h(
                  'p',
                  { className: 'text-sm text-muted-foreground' },
                  'Settings apply immediately and are stored locally.',
                ),
              ]),
              h(
                'section',
                { className: 'rounded-md border border-border/60 p-3 flex flex-col gap-3' },
                [
                  h('h2', { className: 'text-sm font-semibold' }, 'Global Settings'),
                  renderToggle(
                    'showUnpopulatedRegions',
                    'Show unpopulated regions',
                    'Include regions without demand in map labels and overview tables.',
                  ),
                ],
              ),
              h(
                'section',
                { className: 'rounded-md border border-border/60 p-3 flex flex-col gap-3' },
                [
                  h(
                    'h2',
                    { className: 'text-sm font-semibold' },
                    `Dataset Registry (${datasetRows.length})`,
                  ),
                  h(
                    'div',
                    { className: 'overflow-auto max-h-[40vh] rounded border border-border/40' },
                    [
                      h(
                        'table',
                        { className: 'w-full text-xs border-collapse' },
                        [
                          h('thead', {}, [
                            h('tr', { className: 'bg-muted/40 text-muted-foreground' }, [
                              h('th', { className: 'text-left px-2 py-1' }, 'City'),
                              h('th', { className: 'text-left px-2 py-1' }, 'Dataset'),
                              h('th', { className: 'text-left px-2 py-1' }, 'Display Name'),
                              h('th', { className: 'text-left px-2 py-1' }, 'Source'),
                              h('th', { className: 'text-right px-2 py-1' }, 'Expected Size'),
                              h('th', { className: 'text-center px-2 py-1' }, 'Writable'),
                              h('th', { className: 'text-left px-2 py-1' }, 'Status'),
                            ]),
                          ]),
                          h(
                            'tbody',
                            {},
                            datasetRows.length === 0
                              ? [
                                h('tr', {}, [
                                  h(
                                    'td',
                                    {
                                      className:
                                        'px-2 py-2 text-muted-foreground',
                                      colSpan: 7,
                                    },
                                    'No datasets are currently registered.',
                                  ),
                                ]),
                              ]
                              : datasetRows.map((row) =>
                                h(
                                  'tr',
                                  {
                                    key: `${row.cityCode}-${row.datasetId}`,
                                    className:
                                      'border-t border-border/30 odd:bg-background even:bg-muted/15',
                                  },
                                  [
                                    h('td', { className: 'px-2 py-1' }, row.cityCode),
                                    h('td', { className: 'px-2 py-1 font-mono' }, row.datasetId),
                                    h('td', { className: 'px-2 py-1' }, row.displayName),
                                    h('td', { className: 'px-2 py-1' }, row.source),
                                    h(
                                      'td',
                                      { className: 'px-2 py-1 text-right' },
                                      row.expectedSize.toLocaleString(),
                                    ),
                                    h(
                                      'td',
                                      { className: 'px-2 py-1 text-center' },
                                      row.writable ? 'Yes' : 'No',
                                    ),
                                    h('td', { className: 'px-2 py-1 capitalize' }, row.status),
                                  ],
                                ),
                              ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              h(
                'section',
                { className: 'rounded-md border border-border/60 p-3 flex flex-col gap-1' },
                [
                  h('h2', { className: 'text-sm font-semibold' }, 'Fetch Datasets'),
                  h(
                    'p',
                    { className: 'text-xs text-muted-foreground' },
                    'Coming soon. Dataset download/import flow will be integrated in a future update.',
                  ),
                ],
              ),
            ]),
          ],
        )
        : null,
    ]);
  };
}
