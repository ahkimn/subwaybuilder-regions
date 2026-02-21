import type React from 'react';
import type { createElement, useState } from 'react';

import type { RegionsSettings } from '../../../core/settings/types';
import { formatNumberOrDefault } from '../../../core/utils';
import type {
  ReactDataTableRow,
  TableCellPaddingClassName,
  TableOptions,
} from '../../elements/DataTable';
import { ReactDataTable } from '../../elements/DataTable';
import type { SortConfig, SortState } from '../types';
import { SortDirection } from '../types';

export type InputFieldProperties = {
  value?: string;
  placeholder?: string;
  onChange?: (e: Event) => void;
  className?: string;
};

export type SettingsDatasetRow = {
  cityCode: string;
  datasetId: string;
  displayName: string;
  expectedSize: number;
  status: string;
};

const REGISTRY_TABLE_COLUMN_LABELS = [
  'City',
  'Dataset',
  'Display Name',
  'Size',
  'Status',
] as const;

const REGISTRY_COLUMN_COUNT = REGISTRY_TABLE_COLUMN_LABELS.length;

const REGISTRY_SORT_CONFIGS: ReadonlyArray<SortConfig<SettingsDatasetRow>> = [
  {
    index: 0,
    defaultDirection: SortDirection.Asc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.cityCode.localeCompare(bMetrics.cityCode),
  },
  {
    index: 1,
    defaultDirection: SortDirection.Asc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.datasetId.localeCompare(bMetrics.datasetId),
  },
  {
    index: 2,
    defaultDirection: SortDirection.Asc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.displayName.localeCompare(bMetrics.displayName),
  },
  {
    index: 3,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.expectedSize - bMetrics.expectedSize,
  },
  {
    index: 4,
    defaultDirection: SortDirection.Asc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.status.localeCompare(bMetrics.status),
  },
];

const REGISTRY_TABLE_OPTIONS: TableOptions = {
  columnTemplate:
    'minmax(8ch,max-content) minmax(10ch,max-content) minmax(14ch,1fr) minmax(8ch,max-content) minmax(8ch,max-content)',
  density: 'compact',
  tableCellOptions: {
    cellPaddingClassName: {
      left: 'pl-2 pr-1',
      right: 'pl-1 pr-2',
      center: 'px-1.5',
    } satisfies TableCellPaddingClassName,
    stickyHeaderRow: true,
    stickyClassName: 'bg-background/95 backdrop-blur-sm',
    stickyBorderClassName: 'border-border/40',
  },
};

export const DEFAULT_SETTINGS_SORT_STATE: SortState = {
  sortIndex: 0,
  sortDirection: SortDirection.Asc,
  previousSortIndex: 1,
  previousSortDirection: SortDirection.Asc,
};

export function getNextSettingsSortState(
  current: SortState,
  columnIndex: number,
): SortState {
  if (current.sortIndex === columnIndex) {
    return {
      ...current,
      sortDirection:
        current.sortDirection === SortDirection.Asc
          ? SortDirection.Desc
          : SortDirection.Asc,
    };
  }

  const nextSortConfig = resolveRegistrySortConfig(columnIndex);
  return {
    previousSortIndex: current.sortIndex,
    previousSortDirection: current.sortDirection,
    sortIndex: columnIndex,
    sortDirection: nextSortConfig.defaultDirection,
  };
}

export function filterSettingsRows(
  rows: SettingsDatasetRow[],
  searchTerm: string,
): SettingsDatasetRow[] {
  const trimmed = searchTerm.trim().toLowerCase();
  if (!trimmed) {
    return rows;
  }

  return rows.filter((row) => {
    return (
      row.cityCode.toLowerCase().includes(trimmed) ||
      row.datasetId.toLowerCase().includes(trimmed) ||
      row.displayName.toLowerCase().includes(trimmed)
    );
  });
}

export function sortSettingsRows(
  rows: SettingsDatasetRow[],
  sortState: SortState,
): SettingsDatasetRow[] {

  const applySortByConfig = (
    a: SettingsDatasetRow,
    b: SettingsDatasetRow,
    sortIndex: number,
    direction: SortDirection,
  ): number => {
    const config = resolveRegistrySortConfig(sortIndex);
    const comparison = config.compare(a, b);
    return direction === SortDirection.Asc ? comparison : -comparison;
  };

  return [...rows].sort((a, b) => {
    let result = applySortByConfig(
      a,
      b,
      sortState.sortIndex,
      sortState.sortDirection,
    );

    if (result === 0) {
      result = applySortByConfig(
        a,
        b,
        sortState.previousSortIndex,
        sortState.previousSortDirection,
      );
    }

    if (result === 0) {
      result = a.cityCode.localeCompare(b.cityCode);
      if (result === 0) {
        result = a.datasetId.localeCompare(b.datasetId);
      }
      if (result === 0) {
        result = a.displayName.localeCompare(b.displayName);
      }
    }

    return result;
  });
}

export function renderSettingsEntry(
  h: typeof createElement,
  onOpen: () => void,
): React.ReactNode {
  return h('div', { key: 'entry', className: 'flex flex-col gap-1' }, [
    h(
      'button',
      {
        className:
          'inline-flex items-center justify-between gap-2 w-full px-3 py-2 rounded-sm border border-border bg-background hover:bg-accent text-left transition-colors',
        type: 'button',
        onClick: onOpen,
      },
      [
        h('span', { className: 'font-medium text-sm' }, 'Regions Settings'),
        h('span', { className: 'text-xs text-muted-foreground' }, 'Open'),
      ],
    ),
    h(
      'p',
      { className: 'text-xs text-muted-foreground truncate pl-1' },
      'Manage Regions mod settings and datasets',
    ),
  ]);
}

export function renderSettingsOverlay(
  h: typeof createElement,
  useStateHook: typeof useState,
  Input: React.ComponentType<InputFieldProperties>,
  params: {
    settings: RegionsSettings;
    isUpdating: boolean;
    searchTerm: string;
    sortState: SortState;
    rows: SettingsDatasetRow[];
    onClose: () => void;
    onSearchTermChange: (searchTerm: string) => void;
    onSortChange: (columnIndex: number) => void;
    onToggleShowUnpopulatedRegions: (nextValue: boolean) => void;
  },
): React.ReactNode {
  const {
    settings,
    isUpdating,
    searchTerm,
    sortState,
    rows,
    onClose,
    onSearchTermChange,
    onSortChange,
    onToggleShowUnpopulatedRegions,
  } = params;

  return h(
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
            onClick: onClose,
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
        renderGlobalSettingsSection(
          h,
          settings,
          isUpdating,
          onToggleShowUnpopulatedRegions,
        ),
        renderDatasetRegistrySection(
          h,
          useStateHook,
          Input,
          rows,
          searchTerm,
          onSearchTermChange,
          sortState,
          onSortChange,
        ),
        renderFetchDatasetsSection(h),
      ]),
    ],
  );
}

function renderGlobalSettingsSection(
  h: typeof createElement,
  settings: RegionsSettings,
  isUpdating: boolean,
  onToggleShowUnpopulatedRegions: (nextValue: boolean) => void,
): React.ReactNode {
  return h(
    'section',
    { className: 'rounded-md border border-border/60 p-3 flex flex-col gap-3' },
    [
      h('h2', { className: 'text-sm font-semibold' }, 'Global Settings'),
      h('label', { className: 'flex items-start gap-2 text-sm' }, [
        h('input', {
          key: 'show-unpopulated-input',
          type: 'checkbox',
          checked: settings.showUnpopulatedRegions,
          disabled: isUpdating,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            onToggleShowUnpopulatedRegions(event.target.checked);
          },
        }),
        h(
          'div',
          { key: 'show-unpopulated-text', className: 'flex flex-col gap-0.5' },
          [
            h(
              'span',
              { className: 'font-medium text-foreground' },
              'Show unpopulated regions',
            ),
            h(
              'span',
              { className: 'text-xs text-muted-foreground' },
              'Include regions without demand in map labels and table data.',
            ),
          ],
        ),
      ]),
    ],
  );
}

function renderDatasetRegistrySection(
  h: typeof createElement,
  useStateHook: typeof useState,
  Input: React.ComponentType<InputFieldProperties>,
  rows: SettingsDatasetRow[],
  searchTerm: string,
  onSearchTermChange: (searchTerm: string) => void,
  sortState: SortState,
  onSortChange: (columnIndex: number) => void,
): React.ReactNode {
  return h(
    'section',
    { className: 'rounded-md border border-border/60 p-3 flex flex-col gap-3' },
    [
      h(
        'h2',
        { className: 'text-sm font-semibold' },
        `Dataset Registry (${rows.length})`,
      ),
      h(Input, {
        value: searchTerm,
        placeholder: 'Search city, dataset, display name...',
        onChange: (event: Event) => {
          const target = event.target as HTMLInputElement;
          onSearchTermChange(target.value);
        },
      }),
      h(
        'div',
        { className: 'overflow-auto max-h-[40vh] rounded border border-border/40' },
        h(ReactDataTable, {
          h,
          useStateHook,
          tableOptions: REGISTRY_TABLE_OPTIONS,
          tableValues: buildRegistryTableRows(rows, sortState, onSortChange),
        }),
      ),
    ],
  );
}

function buildRegistryTableRows(
  rows: SettingsDatasetRow[],
  sortState: SortState,
  onSortChange: (columnIndex: number) => void,
): ReactDataTableRow[] {
  const headerAlign: ('left' | 'right' | 'center')[] = [
    'left',
    'left',
    'left',
    'right',
    'left',
  ];
  const bodyAlign: ('left' | 'right' | 'center')[] = [
    'left',
    'left',
    'left',
    'right',
    'left',
  ];

  const sortHandlers = Array.from(
    { length: REGISTRY_COLUMN_COUNT },
    (_, index) => () => onSortChange(index),
  );

  const tableRows: ReactDataTableRow[] = [
    {
      rowValues: [...REGISTRY_TABLE_COLUMN_LABELS],
      options: {
        header: true,
        onClick: sortHandlers,
        align: headerAlign,
        borderClassName: '',
        sortState: {
          index: sortState.sortIndex,
          directionLabel:
            sortState.sortDirection === SortDirection.Asc ? ' ▲' : ' ▼',
          sortSelectedClass: 'text-foreground',
        },
      },
    },
  ];

  // Empty search state handling
  if (rows.length === 0) {
    tableRows.push({
      rowValues: ['No datasets match the current filters.'],
      options: {
        colSpan: [REGISTRY_COLUMN_COUNT],
        align: ['left'],
        rowClassName: 'text-xs text-muted-foreground',
      },
    });
    return tableRows;
  }

  for (const row of rows) {
    tableRows.push({
      rowValues: [
        row.cityCode,
        row.datasetId,
        row.displayName,
        formatNumberOrDefault(row.expectedSize),
        formatStatusLabel(row.status),
      ],
      options: {
        align: bodyAlign,
        rowClassName: 'transition-colors',
        rowHoverClassName: 'bg-muted/30',
      },
    });
  }

  return tableRows;
}

function renderFetchDatasetsSection(h: typeof createElement): React.ReactNode {
  return h(
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
  );
}

function resolveRegistrySortConfig(
  sortIndex: number,
): SortConfig<SettingsDatasetRow> {
  return (
    REGISTRY_SORT_CONFIGS.find((config) => config.index === sortIndex) ??
    REGISTRY_SORT_CONFIGS[0]
  );
}

function formatStatusLabel(status: string): string {
  if (!status) {
    return '';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}
