import type { createElement, Dispatch, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { DEFAULT_TABLE_ROWS } from '@/core/constants';
import { ModeShare } from '@/core/domain';
import { formatNumberOrDefault, formatPercentOrDefault } from '@/core/utils';

import type { ReactDataTableRow, TableOptions } from '../../elements/DataTable';
import { ReactDataTable } from '../../elements/DataTable';
import { ReactExtendButton } from '../../elements/ExtendButton';
import { buildSortableHeaderRow } from '../../elements/helpers/data-table-header';
import { ReactInlineToggle } from '../../elements/InlineToggle';
import {
  getBreakdownSortOrder,
  resolveBreakdownSourceLabel,
} from '../shared/commuter-data';
import { getNextSortState } from '../shared/helpers';
import { sortWithFallback } from '../shared/sort';
import type { SortConfig } from '../types';
import { NumberDisplay, SortDirection } from '../types';
import {
  CommuterDimension,
  type CommutersViewAction,
  type CommutersViewState,
} from './types';

type CommuterRowData = {
  breakdownUnitId: string | number;
  regionName: string;
  breakdownSortOrder: number | null;
  commuterValue: number;
  transitValue: number;
  drivingValue: number;
  walkingValue: number;
};

const SORT_CONFIGS: ReadonlyArray<SortConfig<CommuterRowData>> = [
  {
    index: 0,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) => {
      if (
        aMetrics.breakdownSortOrder !== null &&
        bMetrics.breakdownSortOrder !== null
      ) {
        return aMetrics.breakdownSortOrder - bMetrics.breakdownSortOrder;
      }
      return aMetrics.regionName.localeCompare(bMetrics.regionName);
    },
  },
  {
    index: 1,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.commuterValue - bMetrics.commuterValue,
  },
  {
    index: 2,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.transitValue - bMetrics.transitValue,
  },
  {
    index: 3,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.drivingValue - bMetrics.drivingValue,
  },
  {
    index: 4,
    defaultDirection: SortDirection.Desc,
    compare: (aMetrics, bMetrics) =>
      aMetrics.walkingValue - bMetrics.walkingValue,
  },
];

type CommutersBodyTableProps = {
  h: typeof createElement;
  tableOptions: TableOptions;
  tableBodyData: ReactDataTableRow[];
};

type CommuterCountDisplayToggleState = {
  commuterCountDisplay: NumberDisplay;
};

type ModeShareDisplayToggleState = {
  modeShareDisplay: NumberDisplay;
};

export function renderCommutersTable(
  h: typeof createElement,
  viewState: CommutersViewState,
  dispatch: Dispatch<CommutersViewAction>,
  modeShareByBreakdownUnit: Map<string | number, ModeShare>,
  resolveBreakdownUnitName: (unitId: string | number) => string,
): ReactNode {
  const rows = sortCommuterRows(
    deriveCommuterRows(
      modeShareByBreakdownUnit,
      getTotalBreakdownCommuterCount(modeShareByBreakdownUnit),
      viewState,
      resolveBreakdownUnitName,
    ),
    viewState,
  );
  const rowsToDisplay = viewState.tableOptions.expanded
    ? rows.length
    : DEFAULT_TABLE_ROWS;
  const tableOptions: TableOptions = {
    columnTemplate: getColumnTemplate(viewState),
    density: 'standard',
  };
  const tableHeaderData = buildTableHeader(
    h,
    viewState,
    resolveBreakdownSourceLabel(viewState),
    dispatch,
  );
  const rowsToRender = rows.slice(0, rowsToDisplay);
  const tableBodyData = rowsToRender.map((rowData) =>
    buildTableRow(viewState, rowData),
  );

  return h(
    'div',
    {
      className:
        'border-t border-border/30 pt-1 min-h-0 flex flex-col flex-1 overflow-hidden',
    },
    h(ReactDataTable, {
      h,
      useStateHook: useState,
      tableOptions,
      tableValues: tableHeaderData,
    }),
    h(CommutersBodyTable, {
      h,
      tableOptions,
      tableBodyData,
    }),
    rows.length > DEFAULT_TABLE_ROWS
      ? h(
          'div',
          { className: 'pt-1 flex justify-center' },
          ReactExtendButton(
            h,
            viewState.tableOptions.expanded ? 'Collapse' : 'Expand',
            rows.length - DEFAULT_TABLE_ROWS,
            () => dispatch({ type: 'toggle_table_expanded' }),
          ),
        )
      : null,
  );
}

function deriveCommuterRows(
  modeShareByBreakdownUnit: Map<string | number, ModeShare>,
  commuterShareDenominator: number,
  viewState: CommutersViewState,
  resolveBreakdownUnitName: (unitId: string | number) => string,
): CommuterRowData[] {
  return Array.from(modeShareByBreakdownUnit.entries()).map(
    ([unitId, modeShare]) => {
      return {
        breakdownUnitId: unitId,
        regionName: resolveBreakdownUnitName(unitId),
        breakdownSortOrder: getBreakdownSortOrder(viewState.dimension, unitId),
        commuterValue:
          viewState.tableOptions.commuterCountDisplay === NumberDisplay.Absolute
            ? ModeShare.total(modeShare)
            : (ModeShare.total(modeShare) / commuterShareDenominator) * 100,
        transitValue:
          viewState.tableOptions.modeShareDisplay === NumberDisplay.Absolute
            ? modeShare.transit
            : ModeShare.share(modeShare, 'transit') * 100,
        drivingValue:
          viewState.tableOptions.modeShareDisplay === NumberDisplay.Absolute
            ? modeShare.driving
            : ModeShare.share(modeShare, 'driving') * 100,
        walkingValue:
          viewState.tableOptions.modeShareDisplay === NumberDisplay.Absolute
            ? modeShare.walking
            : ModeShare.share(modeShare, 'walking') * 100,
      };
    },
  );
}

function sortCommuterRows(
  rows: CommuterRowData[],
  viewState: CommutersViewState,
): CommuterRowData[] {
  const currentSortState = viewState.sortStates.get(viewState.dimension)!;

  return sortWithFallback(
    rows,
    currentSortState,
    resolveSortConfig,
    (row) => row,
    (aMetrics, bMetrics) => {
      // Apply stable tie-breakers so equal metric rows always render in deterministic order.
      let result = aMetrics.regionName.localeCompare(bMetrics.regionName);
      if (result === 0) {
        result = String(aMetrics.breakdownUnitId).localeCompare(
          String(bMetrics.breakdownUnitId),
        );
      }
      return result;
    },
  );
}

function resolveSortConfig(index: number): SortConfig<CommuterRowData> {
  return (
    SORT_CONFIGS.find((sortConfig) => sortConfig.index === index) ??
    SORT_CONFIGS[0]
  );
}

function CommutersBodyTable({
  h,
  tableOptions,
  tableBodyData,
}: CommutersBodyTableProps): ReactNode {
  const containerRef = useRef<HTMLElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState<boolean>(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateOverflowState = () => {
      const nextHasOverflow =
        container.scrollHeight > container.clientHeight + 1;
      setHasOverflow((current) =>
        current === nextHasOverflow ? current : nextHasOverflow,
      );
    };

    updateOverflowState();

    const resizeObserver = new ResizeObserver(updateOverflowState);
    resizeObserver.observe(container);
    if (container.firstElementChild instanceof HTMLElement) {
      resizeObserver.observe(container.firstElementChild);
    }

    window.addEventListener('resize', updateOverflowState);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateOverflowState);
    };
  }, [tableBodyData.length]);

  return h(
    'div',
    {
      ref: (node: HTMLElement | null) => {
        containerRef.current = node;
      },
      className: `overflow-y-auto min-h-0 flex-1${hasOverflow ? ' pr-2' : ''}`,
      style: {
        ...(hasOverflow
          ? { scrollbarWidth: 'thin', scrollbarGutter: 'stable' }
          : {}),
      },
    },
    h(ReactDataTable, {
      h,
      useStateHook: useState,
      tableOptions,
      tableValues: tableBodyData,
    }),
  );
}

function getColumnTemplate(viewState: CommutersViewState): string {
  const base = [
    'minmax(6rem,18rem)',
    // Commuter/commuter share column is wider to accommodate the wider header
    'minmax(4.5rem,18rem)',
    'minmax(4.5rem,9rem)',
    'minmax(4.5rem,9rem)',
    'minmax(4.5rem,9rem)',
  ];

  return base.join(' ');
}

function buildTableHeader(
  h: typeof createElement,
  viewState: CommutersViewState,
  firstColumnHeaderLabel: string,
  dispatch: Dispatch<CommutersViewAction>,
): ReactDataTableRow[] {
  const currentSortState = viewState.sortStates.get(viewState.dimension)!;
  function changeSort(columnIndex: number) {
    dispatch({
      type: 'set_sort_for_dimension',
      dimension: viewState.dimension,
      sortState: getNextSortState<CommuterRowData>(
        currentSortState,
        columnIndex,
        resolveSortConfig,
      ),
    });
  }

  const isHourlyDimension =
    viewState.dimension === CommuterDimension.CommuteHour;
  const commuterHeadLabel =
    viewState.tableOptions.commuterCountDisplay === NumberDisplay.Absolute
      ? isHourlyDimension
        ? 'Commutes'
        : 'Commuters'
      : isHourlyDimension
        ? 'Commute Share'
        : 'Commuter Share';
  const transitHeadLabel =
    viewState.tableOptions.modeShareDisplay === NumberDisplay.Absolute
      ? 'Transit'
      : 'Transit (%)';
  const drivingHeadLabel =
    viewState.tableOptions.modeShareDisplay === NumberDisplay.Absolute
      ? 'Driving'
      : 'Driving (%)';
  const walkingHeadLabel =
    viewState.tableOptions.modeShareDisplay === NumberDisplay.Absolute
      ? 'Walking'
      : 'Walking (%)';

  const headerLabels = [
    firstColumnHeaderLabel,
    commuterHeadLabel,
    transitHeadLabel,
    drivingHeadLabel,
    walkingHeadLabel,
  ] as const;

  const titleRow = buildSortableHeaderRow({
    headerLabels,
    sortState: currentSortState,
    onSortChange: changeSort,
    align: ['left', 'right', 'right', 'right', 'right'],
  });

  const commuterDisplayControl = h(
    'div',
    { className: 'flex justify-end opacity-80' },
    ReactInlineToggle<CommuterCountDisplayToggleState>(
      h,
      { commuterCountDisplay: viewState.tableOptions.commuterCountDisplay },
      [
        [
          {
            value: NumberDisplay.Absolute,
            field: 'commuterCountDisplay',
            label: 'Abs',
          },
          {
            value: NumberDisplay.Percentage,
            field: 'commuterCountDisplay',
            label: '%',
          },
        ],
      ],
      (next) =>
        dispatch({
          type: 'set_table_commuter_count_display',
          commuterCountDisplay: next.commuterCountDisplay,
        }),
    ),
  );

  const modeDisplayControl = h(
    'div',
    { className: 'flex justify-end opacity-80' },
    ReactInlineToggle<ModeShareDisplayToggleState>(
      h,
      { modeShareDisplay: viewState.tableOptions.modeShareDisplay },
      [
        [
          {
            value: NumberDisplay.Absolute,
            field: 'modeShareDisplay',
            label: 'Abs',
          },
          {
            value: NumberDisplay.Percentage,
            field: 'modeShareDisplay',
            label: '%',
          },
        ],
      ],
      (next) =>
        dispatch({
          type: 'set_table_mode_share_display',
          modeShareDisplay: next.modeShareDisplay,
        }),
    ),
  );

  const controlsRow: ReactDataTableRow = {
    rowValues: ['', commuterDisplayControl, modeDisplayControl, '', ''],
    options: {
      header: true,
      borderClassName: 'border-b border-border/30',
      align: ['left', 'right', 'right', 'right', 'right'],
    },
  };

  return [titleRow, controlsRow];
}

function buildTableRow(
  viewState: CommutersViewState,
  rowData: CommuterRowData,
) {
  const {
    regionName,
    commuterValue,
    transitValue,
    drivingValue,
    walkingValue,
  } = rowData;
  const rowValues: Array<string | number> = [
    regionName,
    viewState.tableOptions.commuterCountDisplay === NumberDisplay.Absolute
      ? formatNumberOrDefault(commuterValue)
      : formatPercentOrDefault(commuterValue),
    viewState.tableOptions.modeShareDisplay === NumberDisplay.Absolute
      ? formatNumberOrDefault(transitValue)
      : formatPercentOrDefault(transitValue),
    viewState.tableOptions.modeShareDisplay === NumberDisplay.Absolute
      ? formatNumberOrDefault(drivingValue)
      : formatPercentOrDefault(drivingValue),
    viewState.tableOptions.modeShareDisplay === NumberDisplay.Absolute
      ? formatNumberOrDefault(walkingValue)
      : formatPercentOrDefault(walkingValue),
  ];
  const options = {
    align: ['left', 'right', 'right', 'right', 'right'] as (
      | 'left'
      | 'right'
      | 'center'
    )[],
    rowClassName: 'transition-colors',
    rowHoverClassName: 'bg-accent text-accent-foreground',
  };

  return { rowValues, options };
}

function getTotalBreakdownCommuterCount(
  modeShareByBreakdownUnit: Map<string | number, ModeShare>,
): number {
  return Array.from(modeShareByBreakdownUnit.values()).reduce(
    (total, modeShare) => total + ModeShare.total(modeShare),
    0,
  );
}
