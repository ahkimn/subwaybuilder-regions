import type React from 'react';
import type { createElement, useState } from 'react';

import { LOADING_VALUE_DISPLAY } from '../../../core/constants';
import {
  ModeShare,
  type RegionSelection,
  RegionSelection as RegionSelectionUtils,
} from '../../../core/types';
import { formatNumberOrDefault, formatPercentOrDefault } from '../../../core/utils';
import type {
  DataRowOptions,
  ReactDataTableRow,
  TableCellPaddingClassName,
  TableOptions,
} from '../../elements/DataTable';
import { ReactDataTable } from '../../elements/DataTable';
import type { SelectButtonConfig } from '../../elements/SelectRow';
import { ReactSelectRow } from '../../elements/SelectRow';
import { SortDirection } from '../types';
import type {
  RegionsOverviewRow,
  RegionsOverviewSortState,
  RegionsOverviewTab,
} from './types';
import { RegionsOverviewTab as RegionsOverviewTabs } from './types';

const MIN_ROWS_FOR_FULL_HEIGHT = 10;
const OVERVIEW_HEADER_LABELS = [
  'Region Name',
  'Real Pop',
  'Area (km\u00B2)',
  'Total Commuters',
  'Residents',
  'Workers',
  'Transit Share',
  'Driving Share',
  'Walking Share',
  'Stations',
  'Track Length (km)',
  'Routes',
] as const;
const OVERVIEW_COLUMN_COUNT = OVERVIEW_HEADER_LABELS.length;
const OVERVIEW_PLACEHOLDER_VALUE = '-';
const OVERVIEW_MIN_COLUMN_PADDING_CH = 2;
const OVERVIEW_MIN_NON_NAME_COLUMN_CH = 7;
const OVERVIEW_NON_NAME_COLUMN_PADDING_WIDTH = '0.75rem';
const OVERVIEW_CELL_PADDING_CLASS_NAMES: TableCellPaddingClassName = {
  left: 'pl-2 pr-1',
  right: 'pl-1 pr-2',
  center: 'px-1.5',
};

function buildOverviewColumnTemplate(headerLabels: readonly string[]): string {
  return headerLabels
    .map((label) => {
      const minCh = Math.max(
        OVERVIEW_MIN_NON_NAME_COLUMN_CH,
        label.length + OVERVIEW_MIN_COLUMN_PADDING_CH,
      );
      return `minmax(calc(${minCh}ch + ${OVERVIEW_NON_NAME_COLUMN_PADDING_WIDTH}),max-content)`;
    })
    .join(' ');
}

export type InputFieldProperties = {
  value?: string;
  placeholder?: string;
  onChange?: (e: Event) => void;
  className?: string;
};

export function renderLayerSelectorRow(
  h: typeof createElement,
  datasetIdentifiers: string[],
  selectedDatasetIdentifier: string,
  getDatasetLabel: (datasetIdentifier: string) => string,
  onSelectDataset: (datasetIdentifier: string) => void,
): React.ReactNode {
  const buttonConfigs: Map<string, SelectButtonConfig> = new Map();
  datasetIdentifiers.forEach((datasetIdentifier) => {
    buttonConfigs.set(datasetIdentifier, {
      label: getDatasetLabel(datasetIdentifier),
      onSelect: () => onSelectDataset(datasetIdentifier),
    });
  });

  return h(
    'div',
    { className: 'flex flex-col gap-1.5' },
    ReactSelectRow(
      h,
      buttonConfigs,
      selectedDatasetIdentifier,
      'regions-overview-layer-select',
    ),
  );
}

export function renderOverviewTabs(
  h: typeof createElement,
  activeTab: RegionsOverviewTab,
  onSetTab: (tab: RegionsOverviewTab) => void,
): React.ReactNode {
  const tabOptions: Map<string, SelectButtonConfig> = new Map();
  tabOptions.set(RegionsOverviewTabs.Overview, {
    label: 'Overview',
    onSelect: () => onSetTab(RegionsOverviewTabs.Overview),
  });
  tabOptions.set(RegionsOverviewTabs.CommuterFlows, {
    label: 'Commuter Flows',
    onSelect: () => onSetTab(RegionsOverviewTabs.CommuterFlows),
  });
  tabOptions.set(RegionsOverviewTabs.Ridership, {
    label: 'Ridership',
    onSelect: () => onSetTab(RegionsOverviewTabs.Ridership),
  });

  return ReactSelectRow(
    h,
    tabOptions,
    activeTab,
    'regions-overview-tab-select',
    true,
  );
}

export function renderOverviewSearchField(
  h: typeof createElement,
  Input: React.ComponentType<InputFieldProperties>,
  searchTerm: string,
  onSearchTermChange: (value: string) => void,
): React.ReactNode {
  return h(Input, {
    value: searchTerm,
    placeholder: 'Search by name...',
    onChange: (e: Event) => {
      const target = e.target as HTMLInputElement;
      onSearchTermChange(target.value);
    },
  });
}

export function renderOverviewTable(
  h: typeof createElement,
  useStateHook: typeof useState,
  rows: RegionsOverviewRow[],
  activeSelection: RegionSelection | null,
  sortState: RegionsOverviewSortState,
  onSortChange: (columnIndex: number) => void,
  onSelectRow: (selection: RegionSelection) => void,
): React.ReactNode {
  const shouldFillAvailableHeight = rows.length > MIN_ROWS_FOR_FULL_HEIGHT;

  const tableOptions: TableOptions = {
    columnTemplate: buildOverviewColumnTemplate(OVERVIEW_HEADER_LABELS),
    density: 'compact',
    cellPaddingClassName: OVERVIEW_CELL_PADDING_CLASS_NAMES,
  };

  const sortHandlers = [
    () => onSortChange(0),
    () => onSortChange(1),
    () => onSortChange(2),
    () => onSortChange(3),
    () => onSortChange(4),
    () => onSortChange(5),
  ];

  const tableAlign: ('left' | 'right' | 'center')[] = ['left', ...Array(OVERVIEW_COLUMN_COUNT - 1).fill('right')];

  const tableRows: ReactDataTableRow[] = [
    {
      rowValues: [...OVERVIEW_HEADER_LABELS],
      options: {
        header: true,
        onClick: sortHandlers,
        align: tableAlign,
        borderClassName: '',
        sortState: {
          index: sortState.sortIndex,
          directionLabel:
            sortState.sortDirection === SortDirection.Asc
              ? ' \u25B2'
              : ' \u25BC',
          sortSelectedClass: 'text-foreground',
        },
      },
    },
  ];

  if (rows.length === 0) {
    tableRows.push({
      rowValues: ['No regions match the current filters.'],
      options: {
        colSpan: [OVERVIEW_COLUMN_COUNT],
        align: ['left'],
        rowClassName: 'text-xs text-muted-foreground',
      },
    });
  } else {
    rows.forEach((row) => {
      const isActive =
        activeSelection !== null &&
        RegionSelectionUtils.isEqual(activeSelection, row.selection);
      const rowAction = () => onSelectRow(row.selection);
      const residents = row.gameData.demandData?.residents ?? 0;
      const workers = row.gameData.demandData?.workers ?? 0;
      const totalCommuters =
        residents !== null && workers !== null ? residents + workers : null;
      const commuterSummary = row.gameData.commuterSummary;
      const totalModeShare = commuterSummary
        ? ModeShare.add(
            commuterSummary.residentModeShare,
            commuterSummary.workerModeShare,
          )
        : null;
      const rowOptions: DataRowOptions = {
        onClick: Array.from({ length: OVERVIEW_COLUMN_COUNT }, () => rowAction),
        align: tableAlign,
        rowClassName: isActive
          ? 'bg-accent text-accent-foreground transition-colors cursor-pointer'
          : 'transition-colors cursor-pointer',
        rowHoverClassName: 'bg-accent text-accent-foreground',
      };

      tableRows.push({
        rowValues: [
          row.gameData.displayName,
          formatNumberOrDefault(row.gameData.realPopulation),
          formatNumberOrDefault(row.gameData.area, 2),
          formatNumberOrDefault(totalCommuters),
          formatNumberOrDefault(residents),
          formatNumberOrDefault(workers),
          totalModeShare
            ? formatPercentOrDefault(ModeShare.share(totalModeShare, 'transit') * 100)
            : LOADING_VALUE_DISPLAY,
          totalModeShare
            ? formatPercentOrDefault(ModeShare.share(totalModeShare, 'driving') * 100)
            : LOADING_VALUE_DISPLAY,
          totalModeShare
            ? formatPercentOrDefault(ModeShare.share(totalModeShare, 'walking') * 100)
            : LOADING_VALUE_DISPLAY,
          OVERVIEW_PLACEHOLDER_VALUE,
          OVERVIEW_PLACEHOLDER_VALUE,
          OVERVIEW_PLACEHOLDER_VALUE,
        ],
        options: rowOptions,
      });
    });
  }

  return h(
    'div',
    {
      className: [
        'rounded-md border border-border/60 overflow-hidden min-h-0',
        shouldFillAvailableHeight ? 'flex-1' : '',
      ]
        .filter(Boolean)
        .join(' '),
    },
    h(
      'div',
      {
        className: shouldFillAvailableHeight
          ? 'overflow-auto h-full px-1.5 py-1'
          : 'overflow-auto px-1.5 py-1',
      },
      h(ReactDataTable, {
        h,
        useStateHook,
        tableOptions,
        tableValues: tableRows,
      }),
    ),
  );
}

export function renderPlaceholderTab(
  h: typeof createElement,
  description: string,
): React.ReactNode {
  return h(
    'div',
    {
      className:
        'rounded-md border border-border/60 px-2 py-3 text-xs text-muted-foreground',
    },
    description,
  );
}
