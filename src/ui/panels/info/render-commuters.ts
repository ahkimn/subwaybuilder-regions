import type { createElement, Dispatch, ReactNode } from 'react';

import { ModeShare, type RegionGameData } from '@/core/types';
import { formatNumberOrDefault, formatPercentOrDefault } from '@/core/utils';

import { ReactDetailRow } from '../../elements/DetailRow';
import { ReactDivider } from '../../elements/Divider';
import { Placeholder } from '../../elements/Placeholder';
import {
  COMPACT_SELECT_ROW_STYLE,
  ReactSelectRow,
  type SelectButtonConfig,
} from '../../elements/SelectRow';
import { ViewHeader } from '../../elements/ViewHeader';
import { resolveCommuterBreakdownData } from '../shared/commuter-data';
import { renderCommutersSankey } from './render-commuters-sankey';
import { renderCommutersTable } from './render-commuters-table';
import {
  CommuterDimension,
  CommuterDirection,
  CommuterDisplayMode,
  type CommutersViewAction,
  type CommutersViewState,
} from './types';

export function renderCommutersView(
  h: typeof createElement,
  gameData: RegionGameData,
  viewState: CommutersViewState,
  dispatch: Dispatch<CommutersViewAction>,
  resolveRegionName: (unitId: string | number) => string,
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
    resolveRegionName,
  );
  const averageCommuteLength =
    viewState.direction === CommuterDirection.Outbound
      ? commuterSummaryData.averageResidentCommuteDistance
      : commuterSummaryData.averageWorkerCommuteDistance;
  const byBreakdownModeShare = breakdownData.modeShareByBreakdownUnit;
  const populationCount = ModeShare.total(aggregateModeShare);
  let content: ReactNode;
  switch (viewState.displayMode) {
    case CommuterDisplayMode.Sankey:
      content = renderCommutersSankey(h, gameData, viewState, breakdownData);
      break;
    case CommuterDisplayMode.BarChart:
      content = Placeholder(h, 'Bar Chart view coming soon');
      break;
    default:
      content = renderCommutersTable(
        h,
        viewState,
        dispatch,
        byBreakdownModeShare,
        breakdownData.resolveBreakdownUnitName,
      );
      break;
  }
  return h(
    'div',
    { className: 'flex flex-col gap-2 text-xs min-h-0 flex-1 overflow-hidden' },
    buildCommutersHeader(h, gameData, viewState, dispatch),
    ...buildSummaryStatistics(
      h,
      populationCount,
      aggregateModeShare,
      averageCommuteLength,
    ),
    ReactDivider(h, 0.5),
    buildCommuterControls(h, viewState, dispatch),
    ReactDivider(h, 0.5),
    content,
  );
}

function buildCommutersHeader(
  h: typeof createElement,
  gameData: RegionGameData,
  viewState: CommutersViewState,
  dispatch: Dispatch<CommutersViewAction>,
): ReactNode {
  const directionConfigs: Map<string, SelectButtonConfig> = new Map();
  directionConfigs.set(CommuterDirection.Outbound, {
    label: 'Residents',
    onSelect: () =>
      dispatch({
        type: 'set_direction',
        direction: CommuterDirection.Outbound,
      }),
  });
  directionConfigs.set(CommuterDirection.Inbound, {
    label: 'Workers',
    onSelect: () =>
      dispatch({
        type: 'set_direction',
        direction: CommuterDirection.Inbound,
      }),
  });

  return ViewHeader(h, gameData.displayName, undefined, [
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
  averageCommuteLength: number | null,
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
    ReactDetailRow(
      h,
      'Average Commute Length',
      `${formatNumberOrDefault(averageCommuteLength, 2)} km`,
    ),
  ];
}

function buildCommuterControls(
  h: typeof createElement,
  viewState: CommutersViewState,
  dispatch: Dispatch<CommutersViewAction>,
): ReactNode {
  const controlNodes: ReactNode[] = [];
  const dimensionConfigs: Map<string, SelectButtonConfig> = new Map();
  dimensionConfigs.set(CommuterDimension.Region, {
    label: 'Region',
    onSelect: () =>
      dispatch({
        type: 'set_dimension',
        dimension: CommuterDimension.Region,
      }),
  });
  dimensionConfigs.set(CommuterDimension.CommuteLength, {
    label: 'Length',
    onSelect: () =>
      dispatch({
        type: 'set_dimension',
        dimension: CommuterDimension.CommuteLength,
      }),
  });
  dimensionConfigs.set(CommuterDimension.CommuteHour, {
    label: 'Time',
    onSelect: () =>
      dispatch({
        type: 'set_dimension',
        dimension: CommuterDimension.CommuteHour,
      }),
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
      dispatch({
        type: 'set_display_mode',
        displayMode: CommuterDisplayMode.Table,
      }),
  });
  viewConfigs.set(CommuterDisplayMode.Sankey, {
    label: 'Sankey',
    onSelect: () =>
      dispatch({
        type: 'set_display_mode',
        displayMode: CommuterDisplayMode.Sankey,
      }),
  });
  // viewConfigs.set(CommuterDisplayMode.BarChart, {
  //   label: 'Bar',
  //   onSelect: () =>
  //     dispatch({
  //       type: 'set_display_mode',
  //       displayMode: CommuterDisplayMode.BarChart,
  //     })
  // });

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
