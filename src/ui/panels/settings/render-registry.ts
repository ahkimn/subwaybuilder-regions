import type React from 'react';
import type { createElement, useState } from 'react';

import { formatNumberOrDefault } from '@/core/utils';

import { Button } from '../../elements/Button';
import type {
  ReactDataTableRow,
  TableCellPaddingClassName,
  TableOptions,
} from '../../elements/DataTable';
import { ReactDataTable } from '../../elements/DataTable';
import { buildSortableHeaderRow } from '../../elements/helpers/data-table-header';
import { PanelSection } from '../../elements/PanelSection';
import { ReactSearchInput } from '../../elements/SearchInput';
import {
  CircleCheck,
  createReactIconElement,
  OctagonX,
  RefreshIcon,
  Trash2,
  TriangleWarning,
} from '../../elements/utils/Icons';
import { getPrimaryChartColorByName } from '../../types/DisplayColor';
import type { InputFieldProperties, SortConfig, TableAlign } from '../types';
import type { SortState } from '../types';
import { SortDirection } from '../types';
import type {
  RegistrySectionParams,
  SettingsDatasetIssue,
  SettingsDatasetRow,
} from './types';

const REGISTRY_TABLE_COLUMN_LABELS = [
  'City Code',
  'City Name',
  'Dataset',
  'Display Name',
  'Origin',
  'Filesize',
  'Status',
] as const;

const REGISTRY_COLUMN_COUNT = REGISTRY_TABLE_COLUMN_LABELS.length;
const FILESIZE_NOT_AVAILABLE_LABEL = 'N/A';

const WARNING_HEX = getPrimaryChartColorByName('Amber').hex;
const CRITICAL_HEX = getPrimaryChartColorByName('Red').hex;
const SUCCESS_HEX = getPrimaryChartColorByName('Green').hex;

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
      (aMetrics.cityName ?? '').localeCompare(bMetrics.cityName ?? ''),
  },
  {
    index: 2,
    defaultDirection: SortDirection.Asc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.datasetId.localeCompare(bMetrics.datasetId),
  },
  {
    index: 3,
    defaultDirection: SortDirection.Asc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.displayName.localeCompare(bMetrics.displayName),
  },
  {
    index: 4,
    defaultDirection: SortDirection.Asc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.origin.localeCompare(bMetrics.origin),
  },
  {
    index: 5,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) => {
      const aSize = aMetrics.fileSizeMB ?? -1;
      const bSize = bMetrics.fileSizeMB ?? -1;
      return aSize - bSize;
    },
  },
  {
    index: 6,
    defaultDirection: SortDirection.Asc,
    compare: (aMetrics, bMetrics) =>
      resolveStatusRank(aMetrics.issue) - resolveStatusRank(bMetrics.issue),
  },
];

const REGISTRY_TABLE_OPTIONS: TableOptions = {
  columnTemplate:
    'minmax(8ch,max-content) minmax(14ch,max-content) minmax(10ch,max-content) minmax(14ch,1fr) minmax(8ch,max-content) minmax(8ch,max-content) minmax(12ch,max-content)',
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

// Helper function to ascertain which rows should be shown based on the user's search term
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
      (row.cityName?.toLowerCase().includes(trimmed) ?? false) ||
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

    // Tie-breaker on localized city codes (these should be unique)
    if (result === 0) {
      result = a.cityCode.localeCompare(b.cityCode);
    }

    return result;
  });
}

export function renderDatasetRegistrySection(
  h: typeof createElement,
  useStateHook: typeof useState,
  Input: React.ComponentType<InputFieldProperties>,
  params: RegistrySectionParams,
): React.ReactNode {
  const {
    rows,
    searchTerm,
    onSearchTermChange,
    sortState,
    onSortChange,
    onRefreshRegistry,
    isRefreshingRegistry,
    onClearMissing,
    isClearingMissing,
  } = params;

  return PanelSection(
    h,
    `Dataset Registry (${rows.length})`,
    [
      h('div', { className: 'flex items-center justify-between gap-2' }, [
        h('div', { className: 'min-w-0 flex-1' }, [
          ReactSearchInput({
            h,
            Input,
            value: searchTerm,
            placeholder: 'Search by city, dataset ID/name...',
            onValueChange: onSearchTermChange,
          }),
        ]),
        h('div', { className: 'flex items-center gap-2' }, [
          Button(h, {
            label: isRefreshingRegistry ? 'Refreshing' : 'Refresh',
            ariaLabel: 'Refresh local registry cache',
            onClick: onRefreshRegistry,
            icon: RefreshIcon,
            iconPlacement: 'start',
            wrapperClassName: 'w-fit',
            buttonClassName:
              'inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm border border-border/40 bg-background/70 hover:bg-accent transition-colors',
            iconOptions: { size: 20, className: 'h-3.5 w-3.5 shrink-0' },
          }),
          Button(h, {
            label: isClearingMissing ? 'Clearing' : 'Clear Missing',
            ariaLabel: 'Remove missing datasets from local registry cache',
            tooltipText:
              'Removes missing cached local entries only. Served entries are not stored in cache and cannot be cleared here.',
            onClick: onClearMissing,
            icon: Trash2,
            iconPlacement: 'start',
            wrapperClassName: 'w-fit',
            buttonClassName:
              'inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm bg-red-600 text-white hover:bg-red-700 transition-colors',
            iconOptions: {
              size: 20,
              className: 'h-3.5 w-3.5 shrink-0 text-white',
            },
          }),
        ]),
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
          tableValues: buildRegistryTableRows(h, rows, sortState, onSortChange),
        }),
      ),
      h('p', { className: 'text-[11px] text-muted-foreground' }, [
        'Missing entries represent datasets that were previously detected locally. ',
        'Served datasets can still show city-unavailable warnings, but ',
        h('span', { className: 'font-medium' }, 'Clear Missing'),
        ' only removes cached local entries.',
      ]),
    ],
    'flex flex-col gap-3',
  );
}

export function resolveRegistrySortConfig(
  sortIndex: number,
): SortConfig<SettingsDatasetRow> {
  return (
    REGISTRY_SORT_CONFIGS.find((config) => config.index === sortIndex) ??
    REGISTRY_SORT_CONFIGS[0]
  );
}

function buildRegistryTableRows(
  h: typeof createElement,
  rows: SettingsDatasetRow[],
  sortState: SortState,
  onSortChange: (columnIndex: number) => void,
): ReactDataTableRow[] {
  const headerAlign: TableAlign[] = [
    'left',
    'left',
    'left',
    'left',
    'left',
    'right',
    'left',
  ];
  const bodyAlign: TableAlign[] = [
    'left',
    'left',
    'left',
    'left',
    'left',
    'right',
    'left',
  ];

  const tableRows: ReactDataTableRow[] = [
    buildSortableHeaderRow({
      headerLabels: REGISTRY_TABLE_COLUMN_LABELS,
      sortState,
      onSortChange,
      align: headerAlign,
      classOverrides: {
        borderClassName: '',
      },
    }),
  ];

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
        row.cityName ?? '-',
        row.datasetId,
        row.displayName,
        row.origin,
        formatFileSizeLabel(row.fileSizeMB),
        renderDatasetStatusCell(h, row.issue),
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

function formatFileSizeLabel(sizeMB: number | null): string {
  if (sizeMB === null || !Number.isFinite(sizeMB) || sizeMB <= 0) {
    return FILESIZE_NOT_AVAILABLE_LABEL;
  }
  return `${formatNumberOrDefault(sizeMB, 2)} MB`;
}

function renderDatasetStatusCell(
  h: typeof createElement,
  issue: SettingsDatasetIssue,
): React.ReactNode {
  if (!issue) {
    return h(
      'span',
      {
        className: 'inline-flex items-center gap-1.5',
        style: { color: SUCCESS_HEX },
      },
      [
        createReactIconElement(h, CircleCheck, {
          size: 14,
          className: 'h-3.5 w-3.5 shrink-0',
        }),
        h('span', { className: 'truncate' }, 'Available'),
      ],
    );
  }

  const issueIcon =
    issue === 'missing_city'
      ? createReactIconElement(h, OctagonX, {
        size: 14,
        className: 'h-3.5 w-3.5 shrink-0',
      })
      : createReactIconElement(h, TriangleWarning, {
        size: 14,
        className: 'h-3.5 w-3.5 shrink-0',
      });
  const issueColor = issue === 'missing_city' ? CRITICAL_HEX : WARNING_HEX;
  const issueLabel = issue === 'missing_city' ? 'City Missing' : 'File Missing';

  return h(
    'span',
    {
      className: 'inline-flex items-center gap-1.5',
      style: { color: issueColor },
    },
    [issueIcon, h('span', { className: 'truncate' }, issueLabel)],
  );
}

function resolveStatusRank(issue: SettingsDatasetIssue): number {
  if (issue === 'missing_city') return 0;
  if (issue === 'missing_file') return 1;
  return 2;
}
