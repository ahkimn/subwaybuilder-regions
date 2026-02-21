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
import { ReactButton } from '../../elements/ReactButton';
import { ReactSearchInput } from '../../elements/SearchInput';
import { ReactSectionCard } from '../../elements/SectionCard';
import { Arrow, MapPinnedIcon, RefreshIcon } from '../../elements/utils/Icons';
import type { SortConfig } from '../types';
import type { SortState } from '../types';
import { SortDirection } from '../types';

export type InputFieldProperties = {
  value?: string;
  placeholder?: string;
  onChange?: (e: Event) => void;
  className?: string;
};

export type SwitchProperties = {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (e: Event) => void;
  id?: string;
};

export type LabelProperties = {
  htmlFor?: string;
  className?: string;
  children?: React.ReactNode;
};

export type SettingsDatasetRow = {
  cityCode: string;
  datasetId: string;
  displayName: string;
  expectedSize: number | null;
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
    compare: (aMetrics, bMetrics) => {
      const aSize = aMetrics.expectedSize ?? -1;
      const bSize = bMetrics.expectedSize ?? -1;
      return aSize - bSize;
    },
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
    ReactButton(h, {
      label: 'Regions',
      ariaLabel: 'Open Regions Settings',
      onClick: onOpen,
      icon: MapPinnedIcon,
      iconPlacement: 'start',
      wrapperClassName: 'w-full',
      buttonClassName:
        'max-w-full font-bold group flex items-center bg-primary text-primary-foreground cursor-pointer ' +
        'justify-start gap-1.5 w-full h-9 hover:bg-primary/90 transition-colors rounded-none px-1',
      labelClassName: 'h-full text-3xl',
      iconOptions: {
        size: 20,
        className:
          'min-w-fit transition-all duration-150 h-9 w-9 ml-1 group-hover:scale-110',
      },
    }),
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
  Switch: React.ComponentType<SwitchProperties>,
  Label: React.ComponentType<LabelProperties>,
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
    onRefreshRegistry: () => void;
    isRefreshingRegistry: boolean;
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
    onRefreshRegistry,
    isRefreshingRegistry,
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
        ReactButton(h, {
          label: 'Back',
          ariaLabel: 'Back',
          onClick: onClose,
          icon: Arrow,
          iconOptions: {
            size: 16,
            className: 'h-4 w-4 shrink-0',
            transform: 'rotate(180deg)',
          },
          wrapperClassName: 'w-fit',
          buttonClassName:
            'inline-flex items-center gap-1.5 px-2 py-1 text-sm rounded-sm bg-background hover:bg-accent',
        }),
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
          Switch,
          Label,
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
          onRefreshRegistry,
          isRefreshingRegistry,
        ),
        renderFetchDatasetsSection(h),
      ]),
    ],
  );
}

function renderGlobalSettingsSection(
  h: typeof createElement,
  Switch: React.ComponentType<SwitchProperties>,
  Label: React.ComponentType<LabelProperties>,
  settings: RegionsSettings,
  isUpdating: boolean,
  onToggleShowUnpopulatedRegions: (nextValue: boolean) => void,
): React.ReactNode {
  const toggleId = 'regions-show-unpopulated-toggle';
  return ReactSectionCard(h, 'Global Settings', [
    h('div', { className: 'flex items-start justify-between gap-3 text-sm' }, [
      h('div', { className: 'flex flex-col gap-0.5' }, [
        h(
          Label,
          {
            htmlFor: toggleId,
            className: 'font-medium text-foreground',
          },
          'Show unpopulated regions',
        ),
        h(
          'span',
          { className: 'text-xs text-muted-foreground' },
          'Include regions without demand in map labels and table data.',
        ),
      ]),
      h(Switch, {
        id: toggleId,
        checked: settings.showUnpopulatedRegions,
        disabled: isUpdating,
        onCheckedChange: onToggleShowUnpopulatedRegions,
        onChange: (event: Event) => {
          const target = event.target as HTMLInputElement;
          onToggleShowUnpopulatedRegions(Boolean(target.checked));
        },
      }),
    ]),
  ]);
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
  onRefreshRegistry: () => void,
  isRefreshingRegistry: boolean,
): React.ReactNode {
  return ReactSectionCard(h, `Dataset Registry (${rows.length})`, [
    h('div', { className: 'flex items-center justify-between gap-2' }, [
      h('div', { className: 'min-w-0 flex-1' }, [
        ReactSearchInput({
          h,
          Input,
          value: searchTerm,
          placeholder: 'Search city, dataset, display name...',
          onValueChange: onSearchTermChange,
        }),
      ]),
      ReactButton(h, {
        label: isRefreshingRegistry ? 'Refreshing' : 'Refresh',
        ariaLabel: 'Refresh local registry cache',
        onClick: onRefreshRegistry,
        icon: RefreshIcon,
        iconPlacement: 'start',
        wrapperClassName: 'w-fit',
        buttonClassName:
          'inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm border border-border bg-background hover:bg-accent transition-colors',
        iconOptions: { size: 14, className: 'h-3.5 w-3.5 shrink-0' },
      }),
    ]),
    h(
      'div',
      {
        className: 'overflow-auto max-h-[40vh] rounded border border-border/40',
      },
      h(ReactDataTable, {
        h,
        useStateHook,
        tableOptions: REGISTRY_TABLE_OPTIONS,
        tableValues: buildRegistryTableRows(rows, sortState, onSortChange),
      }),
    ),
  ]);
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
  return ReactSectionCard(h, 'Fetch Datasets', [
    h(
      'p',
      { className: 'text-xs text-muted-foreground' },
      'Coming soon. Dataset download/import flow will be integrated in a future update.',
    ),
  ]);
}

export function resolveRegistrySortConfig(
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
