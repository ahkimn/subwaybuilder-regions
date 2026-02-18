import type {
  createElement,
  Dispatch,
  ReactNode,
  SetStateAction,
  useState,
} from 'react';
import { useEffect, useRef } from 'react';

import {
  COLOR_COMMUTER_NODES_WITH_MODE_COLORS,
  DISTANCE_BUCKET_COUNT,
  SANKEY_FLOW_DISPLAY_COUNT,
  SANKEY_LABEL_FLOW_SYNC,
} from '../../../core/constants';
import type { RegionCommuterDetailsData } from '../../../core/types';
import { ModeShare, type RegionGameData } from '../../../core/types';
import {
  formatNumberOrDefault,
  formatPercentOrDefault,
} from '../../../core/utils';
import type { ReactDataTableRow, TableOptions } from '../../elements/DataTable';
import { ReactDataTable } from '../../elements/DataTable';
import { ReactDetailRow } from '../../elements/DetailRow';
import { ReactDivider } from '../../elements/Divider';
import { ReactExtendButton } from '../../elements/ExtendButton';
import { ReactInlineToggle } from '../../elements/InlineToggle';
import {
  COMPACT_SELECT_ROW_STYLE,
  ReactSelectRow,
  type SelectButtonConfig,
} from '../../elements/SelectRow';
import { buildReactViewHeader } from '../shared/view-header';
import { renderCommutersSankey } from './render-commuters-sankey';
import {
  CommuterDimension,
  CommuterDirection,
  CommuterDisplayMode,
  type CommutersViewState,
  ModeLayout,
  NumberDisplay,
  SortDirection,
} from './types';

const DEFAULT_TABLE_ROWS = 10; // Max number of rows to show in commuters by region table before truncation
const DEFAULT_DISTANCE_BUCKET_SIZE_KM = 5;

type CommuterBreakdownData = {
  modeShareByBreakdownUnit: Map<string | number, ModeShare>;
  resolveBreakdownUnitName: (unitId: string | number) => string;
  sankeyTopFlowCount: number;
  orderedSankeyUnitIds?: Array<string | number>;
};

type CommuterRowData = {
  breakdownUnitId: string | number;
  regionName: string;
  breakdownSortOrder: number | null;
  commuterValue: number;
  transitValue: number;
  drivingValue: number;
  walkingValue: number;
};

type CommutersBodyTableProps = {
  h: typeof createElement;
  useStateHook: typeof useState;
  tableOptions: TableOptions;
  tableBodyData: ReactDataTableRow[];
};

export function renderCommutersView(
  h: typeof createElement,
  useStateHook: typeof useState,
  gameData: RegionGameData,
  viewState: CommutersViewState,
  setViewState: Dispatch<SetStateAction<CommutersViewState>>,
  resolveBreakdownUnitName: (unitId: string | number) => string,
): ReactNode {
  const commuterSummaryData = gameData.commuterSummary!;
  const commuterDetailsData = gameData.commuterDetails!;
  const isOutbound = viewState.direction === CommuterDirection.Outbound;
  const aggregateModeShare = isOutbound
    ? commuterSummaryData.residentModeShare
    : commuterSummaryData.workerModeShare;
  const breakdownData = resolveCommuterBreakdownData(
    commuterDetailsData,
    viewState,
    resolveBreakdownUnitName,
  );
  const byBreakdownModeShare = breakdownData.modeShareByBreakdownUnit;
  const populationCount = ModeShare.total(aggregateModeShare);
  const rows = sortCommuterRows(
    deriveCommuterRows(
      byBreakdownModeShare,
      populationCount,
      viewState,
      breakdownData.resolveBreakdownUnitName,
    ),
    viewState,
  );
  const rowsToDisplay = viewState.expanded ? rows.length : DEFAULT_TABLE_ROWS;
  const content =
    viewState.displayMode === CommuterDisplayMode.Sankey
      ? renderCommutersSankey(
        h,
        gameData,
        viewState,
        byBreakdownModeShare,
        breakdownData.resolveBreakdownUnitName,
        {
          labelsFollowFlowDirection: SANKEY_LABEL_FLOW_SYNC,
          topFlowCount: breakdownData.sankeyTopFlowCount,
          colorNodesByModeShare: COLOR_COMMUTER_NODES_WITH_MODE_COLORS,
          orderedUnitIds: breakdownData.orderedSankeyUnitIds,
        },
      )
      : buildCommutersTable(
        h,
        useStateHook,
        viewState,
        rows,
        rowsToDisplay,
        setViewState,
      );

  return h(
    'div',
    { className: 'flex flex-col gap-2 text-xs min-h-0' },
    buildCommutersHeader(h, gameData, viewState, setViewState),
    ...buildSummaryStatistics(h, populationCount, aggregateModeShare),
    ReactDivider(h, 0.5),
    buildCommuterControls(h, viewState, setViewState),
    ReactDivider(h, 0.5),
    content,
  );
}

function resolveCommuterBreakdownData(
  commuterDetailsData: RegionCommuterDetailsData,
  viewState: CommutersViewState,
  resolveBreakdownUnitName: (unitId: string | number) => string,
): CommuterBreakdownData {
  const isOutbound = viewState.direction === CommuterDirection.Outbound;

  if (viewState.dimension === CommuterDimension.CommuteLength) {
    const distanceModeShareByBucketStartKm = isOutbound
      ? commuterDetailsData.residentModeShareByCommuteDistance
      : commuterDetailsData.workerModeShareByCommuteDistance;
    const distanceBreakdown = bucketDistanceBreakdownModeShare(
      distanceModeShareByBucketStartKm,
      DEFAULT_DISTANCE_BUCKET_SIZE_KM,
      DISTANCE_BUCKET_COUNT,
    );
    return {
      modeShareByBreakdownUnit: distanceBreakdown.modeShareByBucketStartKm,
      resolveBreakdownUnitName: (unitId) =>
        formatDistanceBreakdownUnitName(
          unitId,
          distanceBreakdown.bucketSizeKm,
        ),
      sankeyTopFlowCount: DISTANCE_BUCKET_COUNT + 1,
      orderedSankeyUnitIds: distanceBreakdown.orderedBucketIds,
    };
  }

  // TODO: CommuteHour rendering path will be split from Region once hourly table/chart views are implemented.
  return {
    modeShareByBreakdownUnit: isOutbound
      ? commuterDetailsData.residentModeShareByRegion
      : commuterDetailsData.workerModeShareByRegion,
    resolveBreakdownUnitName,
    sankeyTopFlowCount: SANKEY_FLOW_DISPLAY_COUNT,
  };
}

function bucketDistanceBreakdownModeShare(
  modeShareByDistanceBucketStartKm: Map<number, ModeShare> | undefined,
  bucketSizeKm: number,
  bucketCount: number,
): {
  modeShareByBucketStartKm: Map<string | number, ModeShare>;
  bucketSizeKm: number;
  orderedBucketIds: Array<string | number>;
} {
  if (!modeShareByDistanceBucketStartKm || modeShareByDistanceBucketStartKm.size === 0) {
    return {
      modeShareByBucketStartKm: new Map<string | number, ModeShare>(),
      bucketSizeKm,
      orderedBucketIds: [],
    };
  }

  const overflowBucketStartKm = bucketSizeKm * bucketCount;
  const overflowBucketId = `${overflowBucketStartKm}+`;
  const modeShareByBucketStartKm = new Map<string | number, ModeShare>();

  modeShareByDistanceBucketStartKm.forEach((modeShare, bucketStartKm) => {
    const bucketId: string | number =
      bucketStartKm >= overflowBucketStartKm
        ? overflowBucketId
        : Math.floor(bucketStartKm / bucketSizeKm) * bucketSizeKm;
    const existing = modeShareByBucketStartKm.get(bucketId);
    if (existing) {
      ModeShare.addInPlace(existing, modeShare);
      return;
    }
    modeShareByBucketStartKm.set(
      bucketId,
      ModeShare.add(ModeShare.createEmpty(), modeShare),
    );
  });

  const numericBucketIds = Array.from(modeShareByBucketStartKm.keys())
    .filter((bucketId): bucketId is number => typeof bucketId === 'number')
    .sort((a, b) => a - b);
  const orderedBucketIds: Array<string | number> = [...numericBucketIds];
  if (modeShareByBucketStartKm.has(overflowBucketId)) {
    orderedBucketIds.push(overflowBucketId);
  }

  return {
    modeShareByBucketStartKm,
    bucketSizeKm,
    orderedBucketIds,
  };
}

function formatDistanceBreakdownUnitName(
  bucketStartKmOrOverflowId: string | number,
  bucketSizeKm: number,
): string {
  if (typeof bucketStartKmOrOverflowId === 'string') {
    if (bucketStartKmOrOverflowId.endsWith('+')) {
      return `${bucketStartKmOrOverflowId.slice(0, -1)}km+`;
    }
    return `${bucketStartKmOrOverflowId}km`;
  }
  const bucketStartKm = bucketStartKmOrOverflowId;
  const bucketEndKm = bucketStartKm + bucketSizeKm;
  return `${bucketStartKm}-${bucketEndKm}km`;
}

function buildCommutersHeader(
  h: typeof createElement,
  gameData: RegionGameData,
  viewState: CommutersViewState,
  setViewState: Dispatch<SetStateAction<CommutersViewState>>,
): ReactNode {
  const directionConfigs: Map<string, SelectButtonConfig> = new Map();
  directionConfigs.set(CommuterDirection.Outbound, {
    label: 'Residents',
    onSelect: () =>
      setViewState((current) =>
        current.direction === CommuterDirection.Outbound
          ? current
          : { ...current, direction: CommuterDirection.Outbound },
      ),
  });
  directionConfigs.set(CommuterDirection.Inbound, {
    label: 'Workers',
    onSelect: () =>
      setViewState((current) =>
        current.direction === CommuterDirection.Inbound
          ? current
          : { ...current, direction: CommuterDirection.Inbound },
      ),
  });

  return buildReactViewHeader(h, gameData.displayName, undefined, [
    ReactSelectRow(
      h,
      directionConfigs,
      viewState.direction,
      'commutes-direction',
      false,
    ),
  ]);
}

function buildSummaryStatistics(
  h: typeof createElement,
  populationCount: number,
  aggregateModeShare: ModeShare,
): ReactNode[] {
  return [
    ReactDetailRow(
      h,
      'Total Commuters',
      formatNumberOrDefault(populationCount),
    ),
    ReactDetailRow(
      h,
      'Transit Mode Share',
      formatPercentOrDefault(
        (aggregateModeShare.transit / populationCount) * 100,
      ),
    ),
    ReactDetailRow(
      h,
      'Driving Mode Share',
      formatPercentOrDefault(
        (aggregateModeShare.driving / populationCount) * 100,
      ),
    ),
    ReactDetailRow(
      h,
      'Walking Mode Share',
      formatPercentOrDefault(
        (aggregateModeShare.walking / populationCount) * 100,
      ),
    ),
  ];
}

function buildCommuterControls(
  h: typeof createElement,
  viewState: CommutersViewState,
  setViewState: Dispatch<SetStateAction<CommutersViewState>>,
): ReactNode {
  const controlNodes: ReactNode[] = [];
  const dimensionConfigs: Map<string, SelectButtonConfig> = new Map();
  dimensionConfigs.set(CommuterDimension.Region, {
    label: 'Region',
    onSelect: () =>
      setViewState((current) =>
        current.dimension === CommuterDimension.Region
          ? current
          : { ...current, dimension: CommuterDimension.Region },
      ),
  });
  dimensionConfigs.set(CommuterDimension.CommuteHour, {
    label: 'Hour',
    onSelect: () =>
      setViewState((current) =>
        current.dimension === CommuterDimension.CommuteHour
          ? current
          : { ...current, dimension: CommuterDimension.CommuteHour },
      ),
  });
  dimensionConfigs.set(CommuterDimension.CommuteLength, {
    label: 'Length',
    onSelect: () =>
      setViewState((current) =>
        current.dimension === CommuterDimension.CommuteLength
          ? current
          : { ...current, dimension: CommuterDimension.CommuteLength },
      ),
  });
  controlNodes.push(
    buildCompactControlGroup(
      h,
      'Breakdown',
      'commutes-dimension',
      dimensionConfigs,
      viewState.dimension,
    ),
  );

  const viewConfigs: Map<string, SelectButtonConfig> = new Map();
  viewConfigs.set(CommuterDisplayMode.Table, {
    label: 'Table',
    onSelect: () =>
      setViewState((current) =>
        current.displayMode === CommuterDisplayMode.Table
          ? current
          : { ...current, displayMode: CommuterDisplayMode.Table },
      ),
  });
  viewConfigs.set(CommuterDisplayMode.Sankey, {
    label: 'Sankey',
    onSelect: () =>
      setViewState((current) =>
        current.displayMode === CommuterDisplayMode.Sankey
          ? current
          : { ...current, displayMode: CommuterDisplayMode.Sankey },
      ),
  });
  viewConfigs.set(CommuterDisplayMode.BarChart, {
    label: 'Bar',
    onSelect: () =>
      setViewState((current) =>
        current.displayMode === CommuterDisplayMode.BarChart
          ? current
          : { ...current, displayMode: CommuterDisplayMode.BarChart },
      ),
  });

  controlNodes.push(
    h(
      'div',
      { className: 'border-l border-border/30 pl-3' },
      buildCompactControlGroup(
        h,
        'View',
        'commutes-display-mode',
        viewConfigs,
        viewState.displayMode,
      ),
    ),
  );

  // Layout control is temporarily hidden to reduce control-bar noise.
  // Keep modeShareLayout state/logic intact so this can be re-enabled later.
  //
  // if (viewState.displayMode === CommuterDisplayMode.Table) {
  //   const layoutConfigs: Map<string, SelectButtonConfig> = new Map();
  //   layoutConfigs.set(ModeLayout.Transit, {
  //     label: 'Transit',
  //     onSelect: () =>
  //       setViewState((current) => {
  //         if (current.modeShareLayout === ModeLayout.Transit) return current;
  //         if (current.modeShareLayout === ModeLayout.All) {
  //           return {
  //             ...current,
  //             modeShareLayout: ModeLayout.Transit,
  //             sortIndex: Math.min(current.sortIndex, 2),
  //             previousSortIndex: Math.min(current.previousSortIndex, 2),
  //           };
  //         }
  //         return { ...current, modeShareLayout: ModeLayout.Transit };
  //       }),
  //   });
  //   layoutConfigs.set(ModeLayout.All, {
  //     label: 'All',
  //     onSelect: () =>
  //       setViewState((current) =>
  //         current.modeShareLayout === ModeLayout.All
  //           ? current
  //           : { ...current, modeShareLayout: ModeLayout.All },
  //       ),
  //   });
  //
  //   controlNodes.push(
  //     h(
  //       'div',
  //       { className: 'border-l border-border/30 pl-3' },
  //       buildCompactControlGroup(
  //         h,
  //         'Layout',
  //         'commutes-mode-layout',
  //         layoutConfigs,
  //         viewState.modeShareLayout,
  //       ),
  //     ),
  //   );
  // }

  return h(
    'div',
    {
      className: 'w-full overflow-x-auto overflow-y-hidden pb-1',
    },
    h(
      'div',
      {
        className:
          'flex min-w-max flex-nowrap items-center justify-start gap-3',
      },
      ...controlNodes,
    ),
  );
}

function buildCompactControlGroup(
  h: typeof createElement,
  label: string,
  selectRowId: string,
  configs: Map<string, SelectButtonConfig>,
  selectedValue: string,
): ReactNode {
  return h(
    'div',
    { className: 'flex items-center justify-start gap-1.5' },
    h(
      'span',
      {
        className:
          'text-[0.72rem] font-semibold tracking-wide text-muted-foreground',
      },
      label,
    ),
    ReactSelectRow(
      h,
      configs,
      selectedValue,
      selectRowId,
      false,
      COMPACT_SELECT_ROW_STYLE,
    ),
  );
}

function deriveCommuterRows(
  modeShareByBreakdownUnit: Map<string | number, ModeShare>,
  populationCount: number,
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
          viewState.commuterCountDisplay === NumberDisplay.Absolute
            ? ModeShare.total(modeShare)
            : (ModeShare.total(modeShare) / populationCount) * 100,
        transitValue:
          viewState.modeShareDisplay === NumberDisplay.Absolute
            ? modeShare.transit
            : ModeShare.share(modeShare, 'transit') * 100,
        drivingValue:
          viewState.modeShareDisplay === NumberDisplay.Absolute
            ? modeShare.driving
            : ModeShare.share(modeShare, 'driving') * 100,
        walkingValue:
          viewState.modeShareDisplay === NumberDisplay.Absolute
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
  const applySort = (
    a: CommuterRowData,
    b: CommuterRowData,
    index: number,
    direction: SortDirection,
  ): number => {
    const m = direction === SortDirection.Asc ? -1 : 1;
    switch (index) {
      case 1:
        return (b.commuterValue - a.commuterValue) * m;
      case 2:
        return (b.transitValue - a.transitValue) * m;
      case 3:
        return (b.drivingValue - a.drivingValue) * m;
      case 4:
        return (b.walkingValue - a.walkingValue) * m;
      default:
        if (
          viewState.dimension === CommuterDimension.CommuteLength &&
          a.breakdownSortOrder !== null &&
          b.breakdownSortOrder !== null
        ) {
          return (a.breakdownSortOrder - b.breakdownSortOrder) * m;
        }
        return a.regionName.localeCompare(b.regionName) * m;
    }
  };

  return [...rows].sort((a, b) => {
    let result = applySort(a, b, viewState.sortIndex, viewState.sortDirection);
    if (result === 0) {
      result = applySort(
        a,
        b,
        viewState.previousSortIndex,
        viewState.previousSortDirection,
      );
    }
    if (result === 0) {
      result = a.regionName.localeCompare(b.regionName);
    }
    return result;
  });
}

function getBreakdownSortOrder(
  dimension: CommuterDimension,
  unitId: string | number,
): number | null {
  if (dimension !== CommuterDimension.CommuteLength) return null;
  if (typeof unitId === 'number') return unitId;
  if (typeof unitId === 'string' && unitId.endsWith('+')) {
    return Number.parseFloat(unitId);
  }
  return null;
}

function buildCommutersTable(
  h: typeof createElement,
  useStateHook: typeof useState,
  viewState: CommutersViewState,
  rows: CommuterRowData[],
  rowsToDisplay: number,
  setViewState: Dispatch<SetStateAction<CommutersViewState>>,
): ReactNode {
  const tableOptions: TableOptions = {
    columnTemplate: getColumnTemplate(viewState),
    density: 'standard',
  };
  const tableHeaderData = buildTableHeader(h, viewState, setViewState);
  const rowsToRender = rows.slice(0, rowsToDisplay);
  const tableBodyData = rowsToRender.map((rowData) =>
    buildTableRow(viewState, rowData),
  );

  return h(
    'div',
    { className: 'border-t border-border/30 pt-1' },
    h(ReactDataTable, {
      h,
      useStateHook,
      tableOptions,
      tableValues: tableHeaderData,
    }),
    h(CommutersBodyTable, {
      h,
      useStateHook,
      tableOptions,
      tableBodyData,
    }),
    rows.length > DEFAULT_TABLE_ROWS
      ? h(
        'div',
        { className: 'pt-1 flex justify-center' },
        ReactExtendButton(
          h,
          viewState.expanded ? 'Collapse' : 'Expand',
          rows.length - DEFAULT_TABLE_ROWS,
          () =>
            setViewState((current) => ({
              ...current,
              expanded: !current.expanded,
            })),
        ),
      )
      : null,
  );
}

function CommutersBodyTable({
  h,
  useStateHook,
  tableOptions,
  tableBodyData,
}: CommutersBodyTableProps): ReactNode {
  const containerRef = useRef<HTMLElement | null>(null);
  const [hasOverflow, setHasOverflow] = useStateHook<boolean>(false);

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
      className: `overflow-y-auto min-h-0${hasOverflow ? ' pr-2' : ''}`,
      style: {
        maxHeight: '60vh',
        ...(hasOverflow
          ? { scrollbarWidth: 'thin', scrollbarGutter: 'stable' }
          : {}),
      },
    },
    h(ReactDataTable, {
      h,
      useStateHook,
      tableOptions,
      tableValues: tableBodyData,
    }),
  );
}

function getColumnTemplate(viewState: CommutersViewState): string {
  const base = [
    'minmax(6rem,1fr)',
    // Commuter/commuter share column is wider to accommodate the wider header
    'minmax(4.5rem,15rem)',
    'minmax(4.5rem,9rem)',
  ];

  if (viewState.modeShareLayout === ModeLayout.All) {
    base.push('minmax(4.5rem,9rem)', 'minmax(4.5rem,9rem)');
  }

  return base.join(' ');
}

function buildTableHeader(
  h: typeof createElement,
  viewState: CommutersViewState,
  setViewState: Dispatch<SetStateAction<CommutersViewState>>,
): ReactDataTableRow[] {
  function changeSort(columnIndex: number) {
    setViewState((current) => {
      if (current.sortIndex === columnIndex) {
        return {
          ...current,
          sortDirection:
            current.sortDirection === SortDirection.Asc
              ? SortDirection.Desc
              : SortDirection.Asc,
        };
      }
      return {
        ...current,
        previousSortIndex: current.sortIndex,
        previousSortDirection: current.sortDirection,
        sortIndex: columnIndex,
        sortDirection: SortDirection.Desc,
      };
    });
  }

  const directionHeadLabel =
    viewState.dimension === CommuterDimension.CommuteLength
      ? 'Distance'
      : viewState.direction === CommuterDirection.Outbound
        ? 'Destination'
        : 'Origin';
  const commuterHeadLabel =
    viewState.commuterCountDisplay === NumberDisplay.Absolute
      ? 'Commuters'
      : 'Commuter Share';
  const transitHeadLabel =
    viewState.modeShareDisplay === NumberDisplay.Absolute
      ? 'Transit'
      : 'Transit (%)';
  const drivingHeadLabel =
    viewState.modeShareDisplay === NumberDisplay.Absolute
      ? 'Driving'
      : 'Driving (%)';
  const walkingHeadLabel =
    viewState.modeShareDisplay === NumberDisplay.Absolute
      ? 'Walking'
      : 'Walking (%)';

  const headerLabels = [
    directionHeadLabel,
    commuterHeadLabel,
    transitHeadLabel,
    ...(viewState.modeShareLayout === ModeLayout.All
      ? [drivingHeadLabel, walkingHeadLabel]
      : []),
  ];
  const sortHandlers = headerLabels.map((_, index) => () => changeSort(index));

  const titleRow: ReactDataTableRow = {
    rowValues: headerLabels,
    options: {
      header: true,
      onClick: sortHandlers,
      align: ['left', 'right', 'right', 'right', 'right'],
      sortState: {
        index: viewState.sortIndex,
        directionLabel:
          viewState.sortDirection === SortDirection.Asc ? ' \u25B2' : ' \u25BC',
        sortSelectedClass: 'text-foreground',
      },
    },
  };

  const commuterDisplayControl = h(
    'div',
    { className: 'flex justify-end opacity-80' },
    ReactInlineToggle<CommutersViewState>(
      h,
      viewState,
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
        setViewState((current) =>
          current.commuterCountDisplay === next.commuterCountDisplay
            ? current
            : { ...current, commuterCountDisplay: next.commuterCountDisplay },
        ),
    ),
  );

  const modeDisplayControl = h(
    'div',
    { className: 'flex justify-end opacity-80' },
    ReactInlineToggle<CommutersViewState>(
      h,
      viewState,
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
        setViewState((current) =>
          current.modeShareDisplay === next.modeShareDisplay
            ? current
            : { ...current, modeShareDisplay: next.modeShareDisplay },
        ),
    ),
  );

  const controlsRow: ReactDataTableRow = {
    rowValues:
      viewState.modeShareLayout === ModeLayout.All
        ? ['', commuterDisplayControl, modeDisplayControl, '', '']
        : ['', commuterDisplayControl, modeDisplayControl],
    options: {
      header: true,
      borderClassName: 'border-b border-border/30',
      align:
        viewState.modeShareLayout === ModeLayout.All
          ? ['left', 'right', 'right', 'right', 'right']
          : ['left', 'right', 'right'],
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
    viewState.commuterCountDisplay === NumberDisplay.Absolute
      ? formatNumberOrDefault(commuterValue)
      : formatPercentOrDefault(commuterValue),
    viewState.modeShareDisplay === NumberDisplay.Absolute
      ? formatNumberOrDefault(transitValue)
      : formatPercentOrDefault(transitValue),
  ];
  const options = {
    align: ['left', 'right', 'right'] as ('left' | 'right' | 'center')[],
    rowClassName: 'transition-colors',
    rowHoverClassName: 'bg-accent text-accent-foreground',
  };

  if (viewState.modeShareLayout === ModeLayout.All) {
    rowValues.push(
      viewState.modeShareDisplay === NumberDisplay.Absolute
        ? formatNumberOrDefault(drivingValue)
        : formatPercentOrDefault(drivingValue),
      viewState.modeShareDisplay === NumberDisplay.Absolute
        ? formatNumberOrDefault(walkingValue)
        : formatPercentOrDefault(walkingValue),
    );
    options.align.push('right', 'right');
  }

  return { rowValues, options };
}
