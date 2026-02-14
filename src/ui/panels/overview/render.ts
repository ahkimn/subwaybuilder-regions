import type React from 'react';
import type { createElement, useState } from 'react';

import {
  type RegionSelection,
  RegionSelection as RegionSelectionUtils,
} from '../../../core/types';
import { formatNumberOrDefault } from '../../../core/utils';
import type {
  DataRowOptions,
  DataTableRow,
  TableOptions
} from '../../elements/DataTable';
import { ReactDataTable } from '../../elements/DataTable';
import type { ReactSelectButtonConfig } from '../../elements/SelectRow';
import { ReactSelectRow } from '../../elements/SelectRow';
import type {
  RegionsOverviewRow,
  RegionsOverviewSortState,
  RegionsOverviewTab,
} from './types';

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
  const buttonConfigs: Map<string, ReactSelectButtonConfig> = new Map();
  datasetIdentifiers.forEach((datasetIdentifier) => {
    buttonConfigs.set(datasetIdentifier, {
      label: getDatasetLabel(datasetIdentifier),
      onSelect: () => onSelectDataset(datasetIdentifier),
    });
  });

  return h(
    'div',
    { className: 'flex flex-col gap-1.5' },
    h(
      'div',
      { className: 'text-xs font-medium text-muted-foreground' },
      'Region Layer',
    ),
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
  const tabOptions: Map<string, ReactSelectButtonConfig> = new Map();
  tabOptions.set('overview', {
    label: 'Overview',
    onSelect: () => onSetTab('overview'),
  });
  tabOptions.set('commuter-flows', {
    label: 'Commuter Flows',
    onSelect: () => onSetTab('commuter-flows'),
  });
  tabOptions.set('ridership', {
    label: 'Ridership',
    onSelect: () => onSetTab('ridership'),
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
  u: typeof useState,
  rows: RegionsOverviewRow[],
  activeSelection: RegionSelection | null,
  sortState: RegionsOverviewSortState,
  onSortChange: (columnIndex: number) => void,
  onSelectRow: (selection: RegionSelection) => void,
): React.ReactNode {
  const tableOptions: TableOptions = {
    columnTemplate:
      'minmax(10rem,1.2fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr)',
    density: 'compact',
  };

  const sortHandlers = [
    () => onSortChange(0),
    () => onSortChange(1),
    () => onSortChange(2),
    () => onSortChange(3),
    () => onSortChange(4),
  ];

  const tableRows: DataTableRow[] = [
    {
      rowValues: ['Region', 'Real Pop', 'Residents', 'Workers', 'Area'],
      options: {
        header: true,
        borderBottom: true,
        onClick: sortHandlers,
        align: ['left', 'right', 'right', 'right', 'right'],
        sortState: {
          index: sortState.sortIndex,
          directionLabel: sortState.sortDirection === 'asc' ? ' ▲' : ' ▼',
          sortSelectedClass: 'text-foreground',
        },
      },
    },
  ];

  if (rows.length === 0) {
    tableRows.push({
      rowValues: ['No regions match the current filters.'],
      options: {
        colSpan: [5],
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
      const rowOptions: DataRowOptions = {
        onClick: [rowAction, rowAction, rowAction, rowAction, rowAction],
        align: ['left', 'right', 'right', 'right', 'right'],
        rowClassName: isActive
          ? 'bg-secondary-foreground/25 text-foreground transition-colors cursor-pointer'
          : 'transition-colors cursor-pointer',
        rowHoverClassName: 'bg-secondary-foreground/15 text-foreground',
      };

      tableRows.push({
        rowValues: [
          row.gameData.displayName,
          formatNumberOrDefault(row.gameData.realPopulation),
          formatNumberOrDefault(row.gameData.demandData?.residents ?? null),
          formatNumberOrDefault(row.gameData.demandData?.workers ?? null),
          formatNumberOrDefault(row.gameData.area, 2),
        ],
        options: rowOptions,
      });
    });
  }

  return h(
    'div',
    { className: 'rounded-md border border-border/60 overflow-hidden min-h-0' },
    h(
      'div',
      { className: 'overflow-auto max-h-[60vh] px-1.5 py-1' },
      ReactDataTable(h, u, tableOptions, tableRows),
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
