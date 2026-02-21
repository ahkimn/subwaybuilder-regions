import type React from 'react';
import type { createElement, useState } from 'react';

import { LOADING_VALUE_DISPLAY } from '../../../core/constants';
import {
  ModeShare,
  type RegionGameData,
  RegionGameData as RegionGameDataUtils,
  type RegionSelection,
  RegionSelection as RegionSelectionUtils,
} from '../../../core/types';
import {
  formatNumberOrDefault,
  formatPercentOrDefault,
} from '../../../core/utils';
import type {
  DataRowOptions,
  ReactDataTableRow,
  TableCellPaddingClassName,
  TableOptions,
} from '../../elements/DataTable';
import { ReactDataTable } from '../../elements/DataTable';
import type { SortConfig } from '../types';
import type { SortState } from '../types';
import { SortDirection } from '../types';
import type { RegionsOverviewRow } from './types';

const MIN_ROWS_FOR_FULL_HEIGHT = 10;
const OVERVIEW_HEADER_LABELS = [
  'Region Name',
  'Real Pop',
  'Area (km\u00B2)',
  'Total Commuters',
  'Residents',
  'Workers',
  'Transit (%)',
  'Driving (%)',
  'Walking (%)',
  'Stations',
  'Tracks (km)',
  'Routes',
] as const;
const OVERVIEW_COLUMN_COUNT = OVERVIEW_HEADER_LABELS.length;
const OVERVIEW_MIN_COLUMN_PADDING_CH = 2;
const OVERVIEW_MIN_NON_NAME_COLUMN_CH = 7;
const OVERVIEW_NON_NAME_COLUMN_PADDING_WIDTH = '0.75rem';
const OVERVIEW_CELL_PADDING_CLASS_NAMES: TableCellPaddingClassName = {
  left: 'pl-2 pr-1',
  right: 'pl-1 pr-2',
  center: 'px-1.5',
};

export type InputFieldProperties = {
  value?: string;
  placeholder?: string;
  onChange?: (e: Event) => void;
  className?: string;
};

export type OverviewSortMetrics = {
  displayName: string;
  featureId: string;
  realPopulation: number;
  area: number;
  residents: number;
  workers: number;
  totalCommuters: number;
  transitShare: number;
  drivingShare: number;
  walkingShare: number;
  stationCount: number;
  trackLengthTotal: number;
  routeCount: number;
};

const SORT_CONFIGS: ReadonlyArray<SortConfig<OverviewSortMetrics>> = [
  {
    index: 0,
    defaultDirection: SortDirection.Asc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.displayName.localeCompare(bMetrics.displayName),
  },
  {
    index: 1,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.realPopulation - bMetrics.realPopulation,
  },
  {
    index: 2,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) => aMetrics.area - bMetrics.area,
  },
  {
    index: 3,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.totalCommuters - bMetrics.totalCommuters,
  },
  {
    index: 4,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) => aMetrics.residents - bMetrics.residents,
  },
  {
    index: 5,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) => aMetrics.workers - bMetrics.workers,
  },
  {
    index: 6,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.transitShare - bMetrics.transitShare,
  },
  {
    index: 7,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.drivingShare - bMetrics.drivingShare,
  },
  {
    index: 8,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.walkingShare - bMetrics.walkingShare,
  },
  {
    index: 9,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.stationCount - bMetrics.stationCount,
  },
  {
    index: 10,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.trackLengthTotal - bMetrics.trackLengthTotal,
  },
  {
    index: 11,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) => aMetrics.routeCount - bMetrics.routeCount,
  },
];

export function renderOverviewTabContent(
  h: typeof createElement,
  useStateHook: typeof useState,
  Input: React.ComponentType<InputFieldProperties>,
  datasetGameData: Map<string | number, RegionGameData>,
  selectedDatasetIdentifier: string,
  activeSelection: RegionSelection | null,
  sortState: SortState,
  searchTerm: string,
  onSearchTermChange: (value: string) => void,
  onSortChange: (columnIndex: number) => void,
  onSelectRow: (selection: RegionSelection, toggleIfSame: boolean) => void,
  onDoubleClickRow: (selection: RegionSelection) => void,
  showUnpopulatedRegions: boolean,
): React.ReactNode {
  const rows = sortRows(
    filterRows(
      buildRows(
        datasetGameData,
        selectedDatasetIdentifier,
        showUnpopulatedRegions,
      ),
      searchTerm,
    ),
    sortState,
  );

  return h(
    'div',
    { className: 'flex flex-col gap-2 min-h-0 flex-1' },
    renderOverviewSearchField(h, Input, searchTerm, onSearchTermChange),
    renderOverviewTable(
      h,
      useStateHook,
      rows,
      activeSelection,
      sortState,
      onSortChange,
      onSelectRow,
      onDoubleClickRow,
    ),
  );
}

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

function renderOverviewSearchField(
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

function renderOverviewTable(
  h: typeof createElement,
  useStateHook: typeof useState,
  rows: RegionsOverviewRow[],
  activeSelection: RegionSelection | null,
  sortState: SortState,
  onSortChange: (columnIndex: number) => void,
  onSelectRow: (selection: RegionSelection, toggleIfSame: boolean) => void,
  onDoubleClickRow: (selection: RegionSelection) => void,
): React.ReactNode {
  const shouldFillAvailableHeight = rows.length > MIN_ROWS_FOR_FULL_HEIGHT;

  const tableOptions: TableOptions = {
    columnTemplate: buildOverviewColumnTemplate(OVERVIEW_HEADER_LABELS),
    density: 'compact',
    tableCellOptions: {
      cellPaddingClassName: OVERVIEW_CELL_PADDING_CLASS_NAMES,
      stickyHeaderRow: true,
      stickyFirstColumn: true,
      stickyClassName: 'bg-background/95 backdrop-blur-sm',
      stickyBorderClassName: 'border-border/40',
    },
  };

  const sortHandlers = Array.from(
    { length: OVERVIEW_COLUMN_COUNT },
    (_, index) => () => onSortChange(index),
  );

  const tableAlign: ('left' | 'right' | 'center')[] = [
    'left',
    ...Array(OVERVIEW_COLUMN_COUNT - 1).fill('right'),
  ];

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
      const rowClickAction = (event?: React.MouseEvent<HTMLDivElement>) => {
        const isModifierClick =
          event?.ctrlKey === true ||
          event?.shiftKey === true ||
          event?.metaKey === true;
        onSelectRow(row.selection, isModifierClick);
      };
      const rowDoubleClickAction = () => onDoubleClickRow(row.selection);
      const residents = row.gameData.demandData?.residents ?? 0;
      const workers = row.gameData.demandData?.workers ?? 0;
      const totalCommuters = residents + workers;

      const commuterSummary = row.gameData.commuterSummary;
      const infraData = row.gameData.infraData;
      const totalTrackLength = infraData
        ? Array.from(infraData.trackLengths.values()).reduce((a, b) => a + b, 0)
        : null;
      const totalModeShare = commuterSummary
        ? ModeShare.add(
            commuterSummary.residentModeShare,
            commuterSummary.workerModeShare,
          )
        : null;
      const rowOptions: DataRowOptions = {
        onClick: Array.from(
          { length: OVERVIEW_COLUMN_COUNT },
          () => rowClickAction,
        ),
        onDoubleClick: Array.from(
          { length: OVERVIEW_COLUMN_COUNT },
          () => rowDoubleClickAction,
        ),
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
            ? formatPercentOrDefault(
                ModeShare.share(totalModeShare, 'transit') * 100,
              )
            : LOADING_VALUE_DISPLAY,
          totalModeShare
            ? formatPercentOrDefault(
                ModeShare.share(totalModeShare, 'driving') * 100,
              )
            : LOADING_VALUE_DISPLAY,
          totalModeShare
            ? formatPercentOrDefault(
                ModeShare.share(totalModeShare, 'walking') * 100,
              )
            : LOADING_VALUE_DISPLAY,
          infraData
            ? formatNumberOrDefault(infraData.stations.size)
            : LOADING_VALUE_DISPLAY,
          infraData
            ? formatNumberOrDefault(totalTrackLength, 2)
            : LOADING_VALUE_DISPLAY,
          infraData
            ? formatNumberOrDefault(infraData.routes.size)
            : LOADING_VALUE_DISPLAY,
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
          ? 'overflow-auto h-full'
          : 'overflow-auto',
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

function buildRows(
  datasetGameData: Map<string | number, RegionGameData>,
  selectedDatasetIdentifier: string,
  showUnpopulatedRegions: boolean,
): RegionsOverviewRow[] {
  const rowsData = showUnpopulatedRegions
    ? Array.from(datasetGameData.values())
    : Array.from(datasetGameData.values()).filter((gameData) =>
        RegionGameDataUtils.isPopulated(gameData),
      );

  return rowsData.map((gameData) => {
    return {
      selection: {
        datasetIdentifier: selectedDatasetIdentifier,
        featureId: gameData.featureId,
      },
      gameData,
    };
  });
}

function filterRows(
  rows: RegionsOverviewRow[],
  searchTerm: string,
): RegionsOverviewRow[] {
  const trimmed = searchTerm.trim().toLowerCase();
  if (!trimmed) {
    return rows;
  }

  return rows.filter(
    (row) =>
      row.gameData.displayName.toLowerCase().includes(trimmed) ||
      row.gameData.fullName.toLowerCase().includes(trimmed),
  );
}

function sortRows(
  rows: RegionsOverviewRow[],
  sortState: SortState,
): RegionsOverviewRow[] {
  const metricsByRow = buildOverviewSortMetrics(rows);
  const applySortByDescriptor = (
    a: RegionsOverviewRow,
    b: RegionsOverviewRow,
    sortIndex: number,
    direction: SortDirection,
  ): number => {
    const cfg = resolveSortConfig(sortIndex);
    const aMetrics = metricsByRow.get(a)!;
    const bMetrics = metricsByRow.get(b)!;
    const comparatorResult = cfg.compare(aMetrics, bMetrics);
    return direction === SortDirection.Asc
      ? comparatorResult
      : -comparatorResult;
  };

  return [...rows].sort((a, b) => {
    let result = applySortByDescriptor(
      a,
      b,
      sortState.sortIndex,
      sortState.sortDirection,
    );
    if (result === 0) {
      result = applySortByDescriptor(
        a,
        b,
        sortState.previousSortIndex,
        sortState.previousSortDirection,
      );
    }
    if (result === 0) {
      const aMetrics = metricsByRow.get(a)!;
      const bMetrics = metricsByRow.get(b)!;
      result = aMetrics.displayName.localeCompare(bMetrics.displayName);
      if (result === 0) {
        result = aMetrics.featureId.localeCompare(bMetrics.featureId);
      }
    }
    return result;
  });
}

export function resolveSortConfig(
  sortIndex: number,
): SortConfig<OverviewSortMetrics> {
  return SORT_CONFIGS.find((cfg) => cfg.index === sortIndex) ?? SORT_CONFIGS[0];
}

function buildOverviewSortMetrics(
  rows: RegionsOverviewRow[],
): Map<RegionsOverviewRow, OverviewSortMetrics> {
  return new Map(
    rows.map((row) => {
      const residents = row.gameData.demandData?.residents ?? 0;
      const workers = row.gameData.demandData?.workers ?? 0;
      const combinedModeShare = ModeShare.add(
        row.gameData.commuterSummary?.residentModeShare ??
          ModeShare.createEmpty(),
        row.gameData.commuterSummary?.workerModeShare ??
          ModeShare.createEmpty(),
      );
      const trackLengthTotal = row.gameData.infraData
        ? Array.from(row.gameData.infraData.trackLengths.values()).reduce(
            (sum, length) => sum + length,
            0,
          )
        : 0;

      const metrics: OverviewSortMetrics = {
        displayName: row.gameData.displayName,
        featureId: String(row.gameData.featureId),
        realPopulation: row.gameData.realPopulation ?? 0,
        area: row.gameData.area ?? 0,
        residents,
        workers,
        totalCommuters: residents + workers,
        transitShare: ModeShare.share(combinedModeShare, 'transit'),
        drivingShare: ModeShare.share(combinedModeShare, 'driving'),
        walkingShare: ModeShare.share(combinedModeShare, 'walking'),
        stationCount: row.gameData.infraData?.stations.size ?? 0,
        trackLengthTotal,
        routeCount: row.gameData.infraData?.routes.size ?? 0,
      };
      return [row, metrics];
    }),
  );
}
