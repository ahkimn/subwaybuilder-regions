import { type createElement, type ReactNode, useState } from 'react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';

import {
  DISTANCE_BUCKET_COUNT,
  SANKEY_FLOW_DISPLAY_COUNT,
  UNASSIGNED_REGION_ID,
} from '../../../core/constants';
import type { ModeKey } from '../../../core/types';
import {
  CommuteType,
  MODE_LABEL,
  MODE_ORDER,
  ModeShare,
  type RegionGameData,
} from '../../../core/types';
import {
  formatNumberOrDefault,
  formatPercentOrDefault,
} from '../../../core/utils';
import { Placeholder } from '../../elements/Placeholder';
import {
  BLACK,
  type ChartDisplayColor,
  getPrimaryChartColorByName,
  hexToRgb,
  rgbToHex,
  SANKEY_TERMINAL_NODE_COLOR,
} from '../../types/DisplayColor';
import {
  HOURLY_SANKEY_FLOW_DISPLAY_COUNT,
  resolveOrderedUnitIds,
  resolveSourceUnitName,
  resolveValueUnitLabel,
} from '../shared/commuter-data';
import type { CommuterBreakdownData, CommutersViewState } from './types';
import { CommuterDimension, CommuterDirection } from './types';

const SANKEY_MIN_WIDTH_PX = 720;
const SANKEY_EMPTY_MESSAGE = 'No commuter flow data available';
const ALL_OTHERS_LABEL = 'Other Regions';
const LABEL_OFFSET = 6;
const LABEL_TITLE_FONT_SIZE = 10;
const LABEL_SUBTITLE_FONT_SIZE = 9;
const LABEL_ROW_GAP = 2;
const LABEL_GAP_BETWEEN_NODES = 2;
const LABEL_TOP_PADDING = 2;
const LABEL_BOTTOM_PADDING_WITH_SUBTITLE = 8;
const LABEL_BOTTOM_PADDING_SINGLE = 2;
const LABEL_BASELINE_DESCENT_BUFFER_WITH_SUBTITLE = 4;
const LABEL_BASELINE_DESCENT_BUFFER_SINGLE = 1;
const MAX_LABEL_CENTER_SHIFT_PX = 4;
const MIN_LABEL_CHARS = 8;

const SANKEY_MODE_COLOR_MUTED: Record<ModeKey, string> = {
  transit: getPrimaryChartColorByName('Blue').mutedHex,
  driving: getPrimaryChartColorByName('Red').mutedHex,
  walking: getPrimaryChartColorByName('Green').mutedHex,
  unknown: getPrimaryChartColorByName('Gray').mutedHex,
};

const SANKEY_MODE_NODE_COLOR: Record<ModeKey, string> = {
  transit: getPrimaryChartColorByName('Blue').hex,
  driving: getPrimaryChartColorByName('Red').hex,
  walking: getPrimaryChartColorByName('Green').hex,
  unknown: getPrimaryChartColorByName('Gray').hex,
};

const SOURCE_CHART_COLOR_BY_TYPE: Record<string, ChartDisplayColor> = {
  [CommuteType.HomeToWork]: getPrimaryChartColorByName('Orange'),
  [CommuteType.WorkToHome]: getPrimaryChartColorByName('Purple'),
};

function getSourceCategoryColor(
  sourceUnitId: string | number,
): ChartDisplayColor | null {
  return SOURCE_CHART_COLOR_BY_TYPE[String(sourceUnitId)] ?? null;
}

type SankeyNodeType = 'selected' | 'region' | 'others' | 'mode';
type SankeyNodeLane = 'source' | 'middle' | 'sink';

type SankeyNodeData = {
  name: string;
  nodeType: SankeyNodeType;
  lane: SankeyNodeLane;
  mode?: ModeKey;
  tooltipBubbleColor?: string;
  fillColor?: string;
};

type SourceBreakdownEntry = {
  sourceUnitId: string | number;
  sourceUnitName: string;
  value: number;
};

type SankeyLinkData = {
  tooltipKind: 'sankey-link';
  source: number;
  sourceName: string;
  target: number;
  targetName: string;
  sourceUnitName: string;
  sinkUnitName: string;
  isSelectedUnitLink: boolean;
  value: number;
  mode: ModeKey;
  displayColor: string;
  displayName: string;
  displayTotal: number;
};

type SankeyData = {
  nodes: SankeyNodeData[];
  links: SankeyLinkData[];
  totalCommuters: number;
  activeModes: ModeKey[];
  sourceLegendEntries: Array<{ label: string; color: string }>;
};

type SplitSourceAggregation = {
  sourceTotalBreakdownBySinkUnit: Map<string | number, SourceBreakdownEntry[]>;
  modeShareBySourceUnit: Map<string | number, ModeShare>;
};

type SplitSourceNodeData = {
  nodes: SankeyNodeData[];
  sourceNodeIndex: Map<string | number, number>;
  modeNodeIndex: Partial<Record<ModeKey, number>>;
  sinkNodeIndex: Map<string | number, number>;
  sourceLegendEntries: Array<{ label: string; color: string }>;
};

type FlowParams = {
  regionId: string | number;
  regionName: string;
  modeShare: ModeShare;
  total: number;
  isAggregate: boolean;
};

type NodeRenderPayload = SankeyNodeData & {
  depth: number;
  value: number;
};

type LinkRenderPayload = SankeyLinkData & {
  index: number;
  source?: NodeRenderPayload;
  target?: NodeRenderPayload;
};

type SankeyCanvasProps = {
  h: typeof createElement;
  sankeyData: SankeyData;
  chartHeight: number;
  displaySourceOnLeft: boolean;
  valueUnitLabel: 'commuters' | 'commutes';
  labelsFollowFlowDirection: boolean;
};

export function renderCommutersSankey(
  h: typeof createElement,
  gameData: RegionGameData,
  viewState: CommutersViewState,
  breakdownData: CommuterBreakdownData,
): ReactNode {
  const byBreakdownUnitModeShare = breakdownData.modeShareByBreakdownUnit;
  const hasSplitSources = Boolean(breakdownData.sourceModeShareByBreakdownUnit);
  const sourceModeShareByBreakdownUnit = hasSplitSources
    ? breakdownData.sourceModeShareByBreakdownUnit!
    : new Map<string | number, Map<string | number, ModeShare>>([
      [gameData.displayName, byBreakdownUnitModeShare],
    ]);
  const topFlowCount = resolveSankeyTopFlowCount(viewState.dimension);
  const displaySourceOnLeft = resolveSankeyDisplaySourceOnLeft(viewState);
  const orderedUnitIds = resolveOrderedUnitIds(
    viewState.dimension,
    byBreakdownUnitModeShare,
  );
  const valueUnitLabel = resolveValueUnitLabel(viewState.dimension);
  const sankeyData = buildSankeyData(
    byBreakdownUnitModeShare,
    sourceModeShareByBreakdownUnit,
    breakdownData.resolveBreakdownUnitName,
    hasSplitSources
      ? (unitId: string | number) =>
        resolveSourceUnitName(viewState.dimension, unitId)
      : () => gameData.displayName,
    topFlowCount,
    displaySourceOnLeft,
    hasSplitSources,
    orderedUnitIds,
  );

  if (sankeyData === null || sankeyData.links.length === 0) {
    return Placeholder(h, SANKEY_EMPTY_MESSAGE);
  }

  const terminalNodeCount = sankeyData.nodes.filter(
    (node) => node.nodeType === 'region' || node.nodeType === 'others',
  ).length;
  const estimatedLabelRows = Math.max(terminalNodeCount, 8);
  const perLabelRowHeight =
    LABEL_TITLE_FONT_SIZE +
    LABEL_ROW_GAP +
    LABEL_SUBTITLE_FONT_SIZE +
    LABEL_GAP_BETWEEN_NODES +
    12;
  // Estimate required height from terminal label count (2-line labels), not raw node count.
  const chartHeight = Math.max(
    360,
    Math.min(760, estimatedLabelRows * perLabelRowHeight + 96),
  );

  return h(
    'div',
    {
      className:
        'border-t border-border/30 pt-1 w-full min-h-0 flex flex-col flex-1 overflow-hidden',
    },
    h(
      'div',
      {
        className: 'overflow-auto min-h-0 w-full flex-1',
        style: {
          scrollbarWidth: 'thin',
          scrollbarGutter: 'stable both-edges',
        },
      },
      h(SankeyCanvas, {
        h,
        sankeyData,
        chartHeight,
        displaySourceOnLeft,
        valueUnitLabel,
        labelsFollowFlowDirection:
          viewState.sankeyOptions.labelsFollowFlowDirection,
      } satisfies SankeyCanvasProps),
    ),
    h(
      'div',
      {
        className:
          'flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-[10px] font-medium text-foreground',
      },
      ...sankeyData.sourceLegendEntries.map((entry) =>
        buildLegendItem(h, entry.label, entry.color),
      ),
      ...sankeyData.activeModes.map((mode) =>
        buildLegendItem(h, MODE_LABEL[mode], SANKEY_MODE_NODE_COLOR[mode]),
      ),
    ),
  );
}

function buildLegendItem(
  h: typeof createElement,
  label: string,
  color: string,
): ReactNode {
  return h(
    'div',
    { className: 'flex items-center gap-2' },
    h('span', {
      className: 'inline-block h-2.5 w-2.5 rounded-full',
      style: { backgroundColor: color },
    }),
    label,
  );
}

function resolveSankeyTopFlowCount(dimension: CommuterDimension): number {
  switch (dimension) {
    case CommuterDimension.CommuteLength:
      return DISTANCE_BUCKET_COUNT + 1;
    case CommuterDimension.CommuteHour:
      return HOURLY_SANKEY_FLOW_DISPLAY_COUNT;
    case CommuterDimension.Region:
    default:
      return SANKEY_FLOW_DISPLAY_COUNT;
  }
}

export function resolveSankeyDisplaySourceOnLeft(
  viewState: CommutersViewState,
): boolean {
  return !(
    viewState.dimension === CommuterDimension.Region &&
    viewState.direction === CommuterDirection.Inbound
  );
}

// Wrapper around the Sankey chart to handle responsive sizing and link hover state.
function SankeyCanvas({
  h,
  sankeyData,
  chartHeight,
  displaySourceOnLeft,
  valueUnitLabel,
  labelsFollowFlowDirection,
}: SankeyCanvasProps): ReactNode {
  const [chartWidth, setChartWidth] = useState<number>(SANKEY_MIN_WIDTH_PX);
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);
  const renderLabelsOnLeft = labelsFollowFlowDirection && !displaySourceOnLeft;

  // Horizontal padding is greater on the side the labels are intended to be rendered on.
  const sankeyMargins = renderLabelsOnLeft
    ? { top: 10, right: 10, bottom: 10, left: 108 }
    : { top: 10, right: 108, bottom: 10, left: 10 };

  return h(
    'div',
    {
      className: 'w-full min-w-0',
      style: {
        minWidth: `${SANKEY_MIN_WIDTH_PX}px`,
        height: `${chartHeight}px`,
      },
    },
    h(
      ResponsiveContainer as any,
      {
        width: '100%',
        height: '100%',
        minWidth: SANKEY_MIN_WIDTH_PX,
        initialDimension: {
          width: SANKEY_MIN_WIDTH_PX,
          height: chartHeight,
        },
        onResize: (width: number) => {
          const nextWidth = Math.max(width, SANKEY_MIN_WIDTH_PX);
          setChartWidth((current) =>
            current === nextWidth ? current : nextWidth,
          );
        },
      },
      h(
        Sankey as any,
        {
          width: '100%',
          height: '100%',
          data: sankeyData,
          align: 'justify',
          margin: sankeyMargins,
          nodePadding: 22,
          nodeWidth: 14,
          sort: false,
          verticalAlign: 'justify',
          isAnimationActive: false,
          node: buildSankeyNodeRenderer(
            h,
            chartWidth,
            chartHeight,
            renderLabelsOnLeft,
            valueUnitLabel,
          ),
          link: buildSankeyLinkRenderer(
            h,
            hoveredLinkIndex,
            setHoveredLinkIndex,
          ),
          onMouseLeave: () => setHoveredLinkIndex(null),
        },
        h(Tooltip as any, {
          content: buildSankeyTooltipRenderer(
            h,
            sankeyData.totalCommuters,
            valueUnitLabel,
          ),
          wrapperStyle: { outline: 'none' },
          // Keep tooltip inside chart bounds and flip toward center near edges.
          allowEscapeViewBox: { x: false, y: false },
          reverseDirection: { x: true, y: true },
          isAnimationActive: false,
          animationDuration: 0,
          offset: 4,
        }),
      ),
    ),
  );
}

function buildSankeyData(
  byBreakdownUnitModeShare: Map<string | number, ModeShare>,
  sourceModeShareByBreakdownUnit: Map<
    string | number,
    Map<string | number, ModeShare>
  >,
  resolveBreakdownUnitName: (unitId: string | number) => string,
  resolveSourceUnitName: (unitId: string | number) => string,
  topFlowCount: number,
  displaySourceOnLeft: boolean,
  useBreakdownMiddle: boolean,
  orderedUnitIds?: Array<string | number>,
): SankeyData | null {
  const displayFlows = getTopFlows(
    byBreakdownUnitModeShare,
    resolveBreakdownUnitName,
    topFlowCount,
    orderedUnitIds,
  );
  if (displayFlows.length === 0) return null;

  const hiddenSinkUnitIds = getHiddenSinkUnitIds(
    displayFlows,
    byBreakdownUnitModeShare,
  );
  const { sourceTotalBreakdownBySinkUnit, modeShareBySourceUnit } =
    buildSourceAggregation(
      displayFlows,
      sourceModeShareByBreakdownUnit,
      resolveSourceUnitName,
      hiddenSinkUnitIds,
    );
  if (modeShareBySourceUnit.size === 0) return null;

  const totalModeShare = calculateTotalModeShare(displayFlows);
  const totalCommuters = ModeShare.total(totalModeShare);
  const activeModes = MODE_ORDER.filter((mode) => totalModeShare[mode] > 0);

  const nodeData = buildSankeyNodes(
    displayFlows,
    modeShareBySourceUnit,
    activeModes,
    useBreakdownMiddle,
    resolveSourceUnitName,
  );
  const links = buildSankeyLinks(
    displayFlows,
    activeModes,
    modeShareBySourceUnit,
    sourceTotalBreakdownBySinkUnit,
    nodeData.sourceNodeIndex,
    nodeData.modeNodeIndex,
    nodeData.sinkNodeIndex,
    displaySourceOnLeft,
    useBreakdownMiddle,
    resolveSourceUnitName,
  );

  return {
    nodes: nodeData.nodes,
    links,
    totalCommuters,
    activeModes,
    sourceLegendEntries: nodeData.sourceLegendEntries,
  };
}

function getTopFlows(
  byBreakdownUnitModeShare: Map<string | number, ModeShare>,
  resolveBreakdownUnitName: (unitId: string | number) => string,
  topFlowCount: number,
  orderedUnitIds?: Array<string | number>,
): FlowParams[] {
  if (byBreakdownUnitModeShare.size === 0) {
    return [];
  }
  const sortedRegions: FlowParams[] = [];
  if (orderedUnitIds && orderedUnitIds.length > 0) {
    orderedUnitIds.forEach((unitId) => {
      const modeShare = byBreakdownUnitModeShare.get(unitId);
      if (!modeShare) return;
      const total = ModeShare.total(modeShare);
      if (total <= 0) return;
      sortedRegions.push({
        regionId: unitId,
        regionName: resolveBreakdownUnitName(unitId),
        modeShare,
        total,
        isAggregate: false,
      });
    });
  } else {
    sortedRegions.push(
      ...Array.from(byBreakdownUnitModeShare.entries())
        .map(([regionId, modeShare]) => ({
          regionId,
          regionName: resolveBreakdownUnitName(regionId),
          modeShare,
          total: ModeShare.total(modeShare),
          isAggregate: false,
        }))
        .filter((entry) => entry.total > 0),
    );
    sortedRegions.sort(orderRegions);
  }

  // Split out the unassigned region (if it exists) so that it can be rendered separately at the bottom of the Sankey
  const unassignedEntry = sortedRegions.find(
    (entry) => String(entry.regionId) === UNASSIGNED_REGION_ID,
  );
  const assignedRegions = sortedRegions.filter(
    (entry) => String(entry.regionId) !== UNASSIGNED_REGION_ID,
  );

  const topFlows: FlowParams[] = assignedRegions
    .slice(0, topFlowCount)
    .map(({ regionId, regionName, modeShare, total }) => ({
      regionId,
      regionName,
      modeShare,
      total,
      isAggregate: false,
    }));

  if (assignedRegions.length > topFlowCount) {
    // If there are any other regions, aggregate them into a single "Other Regions" source/sink within the Sankey
    const otherModeShare = ModeShare.createEmpty();
    let otherTotal = 0;
    assignedRegions.slice(topFlowCount).forEach((entry) => {
      ModeShare.addInPlace(otherModeShare, entry.modeShare);
      otherTotal += entry.total;
    });

    topFlows.push({
      regionId: ALL_OTHERS_LABEL,
      regionName: ALL_OTHERS_LABEL,
      modeShare: otherModeShare,
      total: otherTotal,
      isAggregate: true,
    });
  }

  // Always keep the unassigned region separate and render it last (below "Other Regions").
  if (unassignedEntry && unassignedEntry.total > 0) {
    topFlows.push({
      regionId: unassignedEntry.regionId,
      regionName: unassignedEntry.regionName,
      modeShare: unassignedEntry.modeShare,
      total: unassignedEntry.total,
      isAggregate: false,
    });
  }

  return topFlows;
}

function calculateTotalModeShare(entries: FlowParams[]): ModeShare {
  const totalModeShare = ModeShare.createEmpty();
  entries.forEach((entry) =>
    ModeShare.addInPlace(totalModeShare, entry.modeShare),
  );
  return totalModeShare;
}

function getHiddenSinkUnitIds(
  displayFlows: FlowParams[],
  byBreakdownUnitModeShare: Map<string | number, ModeShare>,
): Set<string> {
  const nonAggregateDisplaySinkUnitIds = new Set(
    displayFlows
      .filter((entry) => !entry.isAggregate)
      .map((entry) => String(entry.regionId)),
  );
  return new Set(
    Array.from(byBreakdownUnitModeShare.keys())
      .map((unitId) => String(unitId))
      .filter((unitId) => !nonAggregateDisplaySinkUnitIds.has(unitId)),
  );
}

function resolveModeShare(
  modeShareByBreakdownUnit: Map<string | number, ModeShare>,
  displayFlow: FlowParams,
  hiddenSinkUnitIds: Set<string>,
): ModeShare {
  if (!displayFlow.isAggregate) {
    return (
      modeShareByBreakdownUnit.get(displayFlow.regionId) ??
      ModeShare.createEmpty()
    );
  }

  const aggregateModeShare = ModeShare.createEmpty();
  modeShareByBreakdownUnit.forEach((modeShare, unitId) => {
    if (!hiddenSinkUnitIds.has(String(unitId))) return;
    ModeShare.addInPlace(aggregateModeShare, modeShare);
  });
  return aggregateModeShare;
}

function buildSourceAggregation(
  displayFlows: FlowParams[],
  sourceModeShareByBreakdownUnit: Map<
    string | number,
    Map<string | number, ModeShare>
  >,
  resolveSourceUnitName: (unitId: string | number) => string,
  hiddenSinkUnitIds: Set<string>,
): SplitSourceAggregation {
  const sourceTotalBreakdownBySinkUnit = new Map<
    string | number,
    SourceBreakdownEntry[]
  >();
  const modeShareBySourceUnit = new Map<string | number, ModeShare>();

  displayFlows.forEach((displayFlow) => {
    sourceTotalBreakdownBySinkUnit.set(displayFlow.regionId, []);
  });

  sourceModeShareByBreakdownUnit.forEach(
    (modeShareByBreakdownUnit, sourceId) => {
      const sourceTotalModeShare = ModeShare.createEmpty();
      const sourceName = resolveSourceUnitName(sourceId);

      displayFlows.forEach((displayFlow) => {
        const modeShare = resolveModeShare(
          modeShareByBreakdownUnit,
          displayFlow,
          hiddenSinkUnitIds,
        );
        const totalForSink = ModeShare.total(modeShare);
        if (totalForSink <= 0) return;

        ModeShare.addInPlace(sourceTotalModeShare, modeShare);
        sourceTotalBreakdownBySinkUnit.get(displayFlow.regionId)!.push({
          sourceUnitId: sourceId,
          sourceUnitName: sourceName,
          value: totalForSink,
        });
      });

      if (ModeShare.total(sourceTotalModeShare) > 0) {
        modeShareBySourceUnit.set(sourceId, sourceTotalModeShare);
      }
    },
  );

  return { sourceTotalBreakdownBySinkUnit, modeShareBySourceUnit };
}

function buildSankeyNodes(
  displayFlows: FlowParams[],
  modeShareBySourceUnit: Map<string | number, ModeShare>,
  activeModes: ModeKey[],
  useBreakdownMiddle: boolean,
  resolveSourceUnitName: (unitId: string | number) => string,
): SplitSourceNodeData {
  const nodes: SankeyNodeData[] = [];
  const sourceNodeIndex = new Map<string | number, number>();
  const modeNodeIndex: Partial<Record<ModeKey, number>> = {};
  const sinkNodeIndex = new Map<string | number, number>();
  const sourceLegendEntries: Array<{ label: string; color: string }> = [];
  const nodeIndexByKey = new Map<string, number>();
  const addNode = (
    key: string,
    name: string,
    kind: SankeyNodeType,
    lane: SankeyNodeLane,
    mode?: ModeKey,
    tooltipBubbleColor?: string,
    fillColor?: string,
  ) => {
    const existing = nodeIndexByKey.get(key);
    if (existing !== undefined) return existing;
    const index = nodes.length;
    nodeIndexByKey.set(key, index);
    nodes.push({
      name,
      nodeType: kind,
      lane,
      mode,
      tooltipBubbleColor,
      fillColor,
    });
    return index;
  };

  const isSingleSource = modeShareBySourceUnit.size === 1;
  modeShareBySourceUnit.forEach((sourceModeShare, sourceUnitId) => {
    const sourceCategoryColor = getSourceCategoryColor(sourceUnitId);
    const sourceNodeColor =
      useBreakdownMiddle && sourceCategoryColor
        ? sourceCategoryColor.hex
        : undefined;
    if (useBreakdownMiddle && sourceCategoryColor) {
      sourceLegendEntries.push({
        label: resolveSourceUnitName(sourceUnitId),
        color: sourceCategoryColor.hex,
      });
    }

    sourceNodeIndex.set(
      sourceUnitId,
      addNode(
        `source:${String(sourceUnitId)}`,
        resolveSourceUnitName(sourceUnitId),
        isSingleSource ? 'selected' : 'region',
        'source',
        undefined,
        sourceNodeColor ?? getModeShareBubbleColor(sourceModeShare),
        sourceNodeColor,
      ),
    );
  });

  activeModes.forEach((mode) => {
    modeNodeIndex[mode] = addNode(
      `mode:${mode}`,
      MODE_LABEL[mode],
      'mode',
      'middle',
      mode,
    );
  });

  displayFlows.forEach((entry) => {
    sinkNodeIndex.set(
      entry.regionId,
      addNode(
        `sink:${String(entry.regionId)}`,
        entry.regionName,
        entry.isAggregate ? 'others' : 'region',
        'sink',
        undefined,
        getModeShareBubbleColor(entry.modeShare),
      ),
    );
  });

  return {
    nodes,
    sourceNodeIndex,
    modeNodeIndex,
    sinkNodeIndex,
    sourceLegendEntries,
  };
}

function buildSankeyLinks(
  displayFlows: FlowParams[],
  activeModes: ModeKey[],
  modeShareBySourceUnit: Map<string | number, ModeShare>,
  sourceTotalBreakdownBySinkUnit: Map<string | number, SourceBreakdownEntry[]>,
  sourceNodeIndex: Map<string | number, number>,
  modeNodeIndex: Partial<Record<ModeKey, number>>,
  sinkNodeIndex: Map<string | number, number>,
  displaySourceOnLeft: boolean,
  useBreakdownMiddle: boolean,
  resolveSourceUnitName: (unitId: string | number) => string,
): SankeyLinkData[] {
  const links: SankeyLinkData[] = [];
  const addLink = (linkData: Omit<SankeyLinkData, 'tooltipKind'>) => {
    links.push({ tooltipKind: 'sankey-link', ...linkData });
  };

  const createSourceModeLinks = (reverse: boolean) => {
    modeShareBySourceUnit.forEach((sourceModeShare, sourceUnitId) => {
      const sourceName = resolveSourceUnitName(sourceUnitId);
      const sourceTotal = ModeShare.total(sourceModeShare);
      activeModes.forEach((mode) => {
        const value = sourceModeShare[mode];
        if (value <= 0) return;
        const modeNode = modeNodeIndex[mode];
        if (modeNode === undefined) return;
        addLink({
          source: reverse ? modeNode : sourceNodeIndex.get(sourceUnitId)!,
          target: reverse ? sourceNodeIndex.get(sourceUnitId)! : modeNode,
          sourceName: reverse ? MODE_LABEL[mode] : sourceName,
          targetName: reverse ? sourceName : MODE_LABEL[mode],
          sourceUnitName: sourceName,
          sinkUnitName: sourceName,
          isSelectedUnitLink: true,
          value,
          mode,
          displayColor: SANKEY_MODE_COLOR_MUTED[mode],
          displayName: sourceName,
          displayTotal: sourceTotal,
        });
      });
    });
  };

  const createModeSinkLinks = (reverse: boolean) => {
    displayFlows.forEach((entry) => {
      activeModes.forEach((mode) => {
        const value = entry.modeShare[mode];
        if (value <= 0) return;
        const modeNode = modeNodeIndex[mode];
        if (modeNode === undefined) return;
        addLink({
          source: reverse ? sinkNodeIndex.get(entry.regionId)! : modeNode,
          target: reverse ? modeNode : sinkNodeIndex.get(entry.regionId)!,
          sourceName: reverse ? entry.regionName : MODE_LABEL[mode],
          targetName: reverse ? MODE_LABEL[mode] : entry.regionName,
          sourceUnitName: reverse ? entry.regionName : MODE_LABEL[mode],
          sinkUnitName: reverse ? MODE_LABEL[mode] : entry.regionName,
          isSelectedUnitLink: false,
          value,
          mode,
          displayColor: SANKEY_MODE_COLOR_MUTED[mode],
          displayName: entry.regionName,
          displayTotal: entry.total,
        });
      });
    });
  };

  const createSourceSinkLinks = (reverse: boolean) => {
    displayFlows.forEach((entry) => {
      const sourceBreakdown =
        sourceTotalBreakdownBySinkUnit.get(entry.regionId) ?? [];
      sourceBreakdown.forEach((breakdownEntry) => {
        if (breakdownEntry.value <= 0) return;
        const sourceCategoryColor = getSourceCategoryColor(
          breakdownEntry.sourceUnitId,
        );
        addLink({
          source: reverse
            ? sinkNodeIndex.get(entry.regionId)!
            : sourceNodeIndex.get(breakdownEntry.sourceUnitId)!,
          target: reverse
            ? sourceNodeIndex.get(breakdownEntry.sourceUnitId)!
            : sinkNodeIndex.get(entry.regionId)!,
          sourceName: reverse
            ? entry.regionName
            : breakdownEntry.sourceUnitName,
          targetName: reverse
            ? breakdownEntry.sourceUnitName
            : entry.regionName,
          sourceUnitName: reverse
            ? entry.regionName
            : breakdownEntry.sourceUnitName,
          sinkUnitName: reverse
            ? breakdownEntry.sourceUnitName
            : entry.regionName,
          isSelectedUnitLink: false,
          value: breakdownEntry.value,
          mode: 'unknown',
          displayColor:
            sourceCategoryColor?.mutedHex ?? SANKEY_MODE_COLOR_MUTED.unknown,
          displayName: entry.regionName,
          displayTotal: entry.total,
        });
      });
    });
  };

  if (useBreakdownMiddle) {
    if (displaySourceOnLeft) {
      createSourceSinkLinks(false);
      createModeSinkLinks(true);
    } else {
      createModeSinkLinks(false);
      createSourceSinkLinks(true);
    }
  } else if (displaySourceOnLeft) {
    createSourceModeLinks(false);
    createModeSinkLinks(false);
  } else {
    createModeSinkLinks(true);
    createSourceModeLinks(true);
  }

  return links;
}

function getModeShareBubbleColor(modeShare: ModeShare): string {
  const total = ModeShare.total(modeShare);
  const weightedRgb = MODE_ORDER.reduce(
    (acc, mode) => {
      const modeValue = modeShare[mode];
      if (modeValue <= 0) return acc;
      const modeColor = hexToRgb(SANKEY_MODE_NODE_COLOR[mode]);
      if (!modeColor) return acc;
      const weight = modeValue / total;
      return {
        r: acc.r + modeColor.r * weight,
        g: acc.g + modeColor.g * weight,
        b: acc.b + modeColor.b * weight,
      };
    },
    { r: 0, g: 0, b: 0 },
  );

  return rgbToHex(weightedRgb);
}

function truncateLabel(label: string, maxLength = 24): string {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 3)}...`;
}

function buildSankeyNodeRenderer(
  h: typeof createElement,
  chartWidth: number,
  chartHeight: number,
  renderLabelsOnLeft: boolean,
  valueUnitLabel: 'commuters' | 'commutes',
): (props: unknown) => ReactNode {
  return function SankeyNodeShape(props: unknown): ReactNode {
    const shape = props as Record<string, unknown>;
    const payload = shape.payload as NodeRenderPayload;
    const x = Number(shape.x);
    const y = Number(shape.y);
    const width = Number(shape.width);
    const height = Number(shape.height);

    const isModeNode = payload.nodeType === 'mode';
    const isSelectedNode = payload.nodeType === 'selected';

    const nodeFill =
      payload.fillColor ??
      (isModeNode
        ? SANKEY_MODE_NODE_COLOR[payload.mode!]
        : SANKEY_TERMINAL_NODE_COLOR);

    const countLabel = `${formatNumberOrDefault(payload.value)} ${valueUnitLabel}`;
    const textX = renderLabelsOnLeft
      ? x - LABEL_OFFSET
      : x + width + LABEL_OFFSET;
    const textAnchor = renderLabelsOnLeft ? 'end' : 'start';
    const availableWidth = renderLabelsOnLeft
      ? Math.max(0, x - LABEL_OFFSET - 2)
      : Math.max(0, chartWidth - textX - 2);
    const maxTitleChars = Math.max(
      MIN_LABEL_CHARS,
      Math.floor(availableWidth / (LABEL_TITLE_FONT_SIZE * 0.58)),
    );
    const maxSubtitleChars = Math.max(
      MIN_LABEL_CHARS,
      Math.floor(availableWidth / (LABEL_SUBTITLE_FONT_SIZE * 0.58)),
    );
    const titleText = truncateLabel(payload.name, maxTitleChars);
    const subtitleText = truncateLabel(countLabel, maxSubtitleChars);

    const fullBlockHeight =
      LABEL_TITLE_FONT_SIZE + LABEL_ROW_GAP + LABEL_SUBTITLE_FONT_SIZE;
    const singleBlockHeight = LABEL_TITLE_FONT_SIZE;
    const minCenterYWithSubtitle =
      LABEL_TOP_PADDING +
      LABEL_BASELINE_DESCENT_BUFFER_WITH_SUBTITLE +
      fullBlockHeight / 2;
    const maxCenterYWithSubtitle =
      chartHeight -
      LABEL_BOTTOM_PADDING_WITH_SUBTITLE -
      LABEL_BASELINE_DESCENT_BUFFER_WITH_SUBTITLE -
      fullBlockHeight / 2;
    const minCenterYSingle =
      LABEL_TOP_PADDING +
      LABEL_BASELINE_DESCENT_BUFFER_SINGLE +
      singleBlockHeight / 2;
    const maxCenterYSingle =
      chartHeight -
      LABEL_BOTTOM_PADDING_SINGLE -
      LABEL_BASELINE_DESCENT_BUFFER_SINGLE -
      singleBlockHeight / 2;

    const nodeCenterY = y + height / 2;
    let centerY = nodeCenterY;
    let showSubtitle =
      height >= 8 && minCenterYWithSubtitle <= maxCenterYWithSubtitle;
    if (showSubtitle) {
      const centeredWithSubtitle = Math.max(
        minCenterYWithSubtitle,
        Math.min(nodeCenterY, maxCenterYWithSubtitle),
      );
      const maxAllowedShift = Math.max(
        MAX_LABEL_CENTER_SHIFT_PX,
        height * 0.35,
      );
      if (Math.abs(centeredWithSubtitle - nodeCenterY) > maxAllowedShift) {
        showSubtitle = false;
      } else {
        centerY = centeredWithSubtitle;
      }
    }

    if (!showSubtitle) {
      centerY = Math.max(
        minCenterYSingle,
        Math.min(nodeCenterY, maxCenterYSingle),
      );
    }

    const titleY = showSubtitle
      ? centerY - (LABEL_ROW_GAP + LABEL_SUBTITLE_FONT_SIZE) / 2
      : centerY;
    const subtitleY = centerY + (LABEL_ROW_GAP + LABEL_TITLE_FONT_SIZE) / 2;

    return h(
      'g',
      null,
      h('rect', {
        x,
        y,
        width,
        height,
        fill: nodeFill,
        fillOpacity: 1,
        stroke: BLACK,
        strokeOpacity: 0.14,
        strokeWidth: 1,
        rx: 3,
        ry: 3,
      }),
      h(
        'text',
        {
          x: textX,
          y: titleY,
          fill: 'currentColor',
          className: 'text-foreground',
          fontSize: LABEL_TITLE_FONT_SIZE,
          fontWeight: isSelectedNode ? 700 : isModeNode ? 600 : 500,
          dominantBaseline: 'middle',
          textAnchor,
        },
        titleText,
      ),
      showSubtitle
        ? h(
          'text',
          {
            x: textX,
            y: subtitleY,
            fill: 'currentColor',
            className: 'text-muted-foreground',
            fontSize: LABEL_SUBTITLE_FONT_SIZE,
            fontWeight: 500,
            dominantBaseline: 'middle',
            textAnchor,
          },
          subtitleText,
        )
        : null,
    );
  };
}

function buildSankeyLinkRenderer(
  h: typeof createElement,
  hoveredLinkIndex: number | null,
  setHoveredLinkIndex: (index: number | null) => void,
): (props: unknown) => ReactNode {
  return function SankeyLinkShape(props: unknown): ReactNode {
    const shape = props as Record<string, unknown>;
    const sourceX = Number(shape.sourceX);
    const sourceY = Number(shape.sourceY);
    const targetX = Number(shape.targetX);
    const targetY = Number(shape.targetY);
    const sourceControlX = Number(shape.sourceControlX);
    const targetControlX = Number(shape.targetControlX);
    const width = Math.max(1, Number(shape.linkWidth) || 1);
    const index = Number(shape.index);
    const payload = shape.payload as LinkRenderPayload;

    const controlLeft = Number.isNaN(sourceControlX)
      ? sourceX + (targetX - sourceX) * 0.35
      : sourceControlX;
    const controlRight = Number.isNaN(targetControlX)
      ? sourceX + (targetX - sourceX) * 0.65
      : targetControlX;
    const pathData = `M${sourceX},${sourceY}C${controlLeft},${sourceY} ${controlRight},${targetY} ${targetX},${targetY}`;

    const hasHoveredLink = hoveredLinkIndex !== null;
    const isHoveredLink = hasHoveredLink && hoveredLinkIndex === index;
    const strokeOpacity = hasHoveredLink ? (isHoveredLink ? 0.9 : 0.2) : 0.55;
    const strokeWidth = isHoveredLink ? width + 1.6 : width;

    return h('path', {
      d: pathData,
      fill: 'none',
      stroke: payload.displayColor,
      strokeOpacity,
      strokeWidth,
      vectorEffect: 'non-scaling-stroke',
      onMouseEnter: Number.isNaN(index)
        ? undefined
        : () => setHoveredLinkIndex(index),
      onMouseLeave: Number.isNaN(index)
        ? undefined
        : () => setHoveredLinkIndex(null),
    });
  };
}

function buildTooltipContainer(
  h: typeof createElement,
  title: ReactNode,
  tooltipLabelLines: string[],
  modeColor?: string,
): ReactNode {
  return h(
    'div',
    {
      className:
        'rounded-md border border-border/80 bg-background/95 shadow-md px-2.5 py-2 text-[0.72rem] leading-tight',
    },
    h(
      'div',
      {
        className:
          'flex items-center gap-1.5 text-foreground font-semibold text-sm pb-1',
      },
      modeColor
        ? h('span', {
          className: 'inline-block h-2 w-2 rounded-full shrink-0',
          style: { backgroundColor: modeColor },
        })
        : null,
      title,
    ),
    ...tooltipLabelLines.map((line, index) =>
      h(
        'div',
        {
          className:
            index === 0 ? 'text-foreground/90' : 'text-muted-foreground pt-0.5',
        },
        line,
      ),
    ),
  );
}

function isLinkPayload(value: unknown): value is LinkRenderPayload {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    entry.tooltipKind === 'sankey-link' &&
    typeof entry.mode === 'string' &&
    typeof entry.displayName === 'string' &&
    typeof entry.displayTotal === 'number' &&
    typeof entry.value === 'number'
  );
}

function extractTooltipPayloadValue(value: unknown): unknown {
  let current = value;
  while (current && typeof current === 'object') {
    const entry = current as Record<string, unknown>;
    if (entry.payload === undefined) return current;
    current = entry.payload;
  }
  return current;
}

function buildSankeyTooltipRenderer(
  h: typeof createElement,
  totalCommuters: number,
  valueUnitLabel: 'commuters' | 'commutes',
): (props: unknown) => ReactNode {
  return function SankeyTooltip(props: unknown): ReactNode {
    const tooltip = props as {
      active?: boolean;
      payload?: Array<{ payload?: LinkRenderPayload | NodeRenderPayload }>;
    };

    if (!tooltip.active || !tooltip.payload || tooltip.payload.length === 0) {
      return null;
    }

    const payloadItem = tooltip.payload[0] as {
      payload?: LinkRenderPayload | NodeRenderPayload | { payload?: unknown };
    };
    const tooltipPayload = extractTooltipPayloadValue(payloadItem);

    const linkData = isLinkPayload(tooltipPayload) ? tooltipPayload : null;

    if (linkData) {
      const totalShare = (linkData.value / totalCommuters) * 100;
      const linkShare = (linkData.value / linkData.displayTotal) * 100;
      const shouldShowUnitShare = linkData.displayTotal !== totalCommuters;
      const tooltipLabelLines = [
        `${formatNumberOrDefault(linkData.value)} ${valueUnitLabel}`,
        `${formatPercentOrDefault(totalShare)} of all ${valueUnitLabel}`,
        ...(shouldShowUnitShare
          ? [
            `${formatPercentOrDefault(linkShare)} of ${linkData.displayName} ${valueUnitLabel}`,
          ]
          : []),
      ];
      return buildTooltipContainer(
        h,
        linkData.isSelectedUnitLink
          ? linkData.sourceUnitName
          : `${linkData.sourceUnitName} | ${linkData.sinkUnitName}`,
        tooltipLabelLines,
        SANKEY_MODE_NODE_COLOR[linkData.mode],
      );
    }

    const nodeData = tooltipPayload as NodeRenderPayload;
    const nodeTotal = typeof nodeData.value === 'number' ? nodeData.value : 0;
    const nodeShare = (nodeTotal / totalCommuters) * 100;

    return buildTooltipContainer(
      h,
      nodeData.name,
      [
        `${formatNumberOrDefault(nodeTotal)} ${valueUnitLabel}`,
        `${formatPercentOrDefault(nodeShare)} of all ${valueUnitLabel}`,
      ],
      nodeData.nodeType === 'mode'
        ? SANKEY_MODE_NODE_COLOR[nodeData.mode!]
        : nodeData.tooltipBubbleColor,
    );
  };
}

function orderRegions(
  a: { regionId: string | number; regionName: string; total: number },
  b: { regionId: string | number; regionName: string; total: number },
): number {
  // If totals are equal, apply a tiebreaker based on region name and then feature ID.
  if (a.total === b.total) {
    const nameCompare = a.regionName.localeCompare(b.regionName);
    if (nameCompare !== 0) return nameCompare;
    return String(a.regionId).localeCompare(String(b.regionId));
  }
  return b.total - a.total;
}
