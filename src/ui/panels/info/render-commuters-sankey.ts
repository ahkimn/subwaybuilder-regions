import type { ComponentType, createElement, ReactNode } from 'react';

import { ModeShare, type RegionGameData } from '../../../core/types';
import {
  formatNumberOrDefault,
  formatPercentOrDefault,
} from '../../../core/utils';
import {
  CommuterDirection,
  type CommutersViewState,
  ModeLayout,
} from './types';

const DEFAULT_TABLE_ROWS = 10;
const SANKEY_TOP_FLOW_COUNT = 10;
const SANKEY_EMPTY_MESSAGE = 'No commuter flow data available';
const SANKEY_CHART_UNAVAILABLE_MESSAGE =
  'Sankey chart components are unavailable in this game build';

const SANKEY_MODE_COLOR = {
  transit: '#2563eb',
  driving: '#dc2626',
  walking: '#16a34a',
  neutral: '#64748b',
} as const;

const SANKEY_NODE_COLOR = {
  active: '#e2e8f0',
  region: '#9ca3af',
  others: '#64748b',
} as const;

const ALL_OTHERS_LABEL = 'All Others';

type SankeyCharts = {
  ResponsiveContainer: ComponentType<any>;
  Sankey: ComponentType<any>;
  Tooltip: ComponentType<any>;
};

type SankeyNodeRole = 'active' | 'region' | 'others';
type SankeyLinkMode = 'mixed' | 'transit' | 'driving' | 'walking';

type SankeyNodeData = {
  name: string;
  role: SankeyNodeRole;
  fill: string;
};

type SankeyLinkData = {
  source: number;
  target: number;
  value: number;
  color: string;
  mode: SankeyLinkMode;
  transit: number;
  driving: number;
  walking: number;
  unknown: number;
  total: number;
  isAggregated: boolean;
  sourceName: string;
  targetName: string;
};

type SankeyData = {
  nodes: SankeyNodeData[];
  links: SankeyLinkData[];
};

type FlowEntry = {
  regionName: string;
  modeShare: ModeShare;
  isAggregated: boolean;
};

export function renderCommutersSankey(
  h: typeof createElement,
  gameData: RegionGameData,
  viewState: CommutersViewState,
  byRegionModeShare: Map<string, ModeShare>,
): ReactNode {
  const charts = resolveSankeyCharts();
  if (!charts) {
    return h(
      'div',
      {
        className:
          'rounded-md border border-border/60 px-2 py-3 text-xs text-muted-foreground',
      },
      SANKEY_CHART_UNAVAILABLE_MESSAGE,
    );
  }

  const sankeyData = buildSankeyData(
    gameData.displayName,
    byRegionModeShare,
    viewState,
  );
  if (!sankeyData || sankeyData.links.length === 0) {
    return h(
      'div',
      {
        className:
          'rounded-md border border-border/60 px-2 py-3 text-xs text-muted-foreground',
      },
      SANKEY_EMPTY_MESSAGE,
    );
  }

  const { ResponsiveContainer, Sankey, Tooltip } = charts;
  const estimatedRowCount = Math.max(sankeyData.nodes.length, DEFAULT_TABLE_ROWS);
  const chartHeight = Math.max(
    280,
    Math.min(
      560,
      estimatedRowCount *
        (viewState.modeShareLayout === ModeLayout.All ? 26 : 22),
    ),
  );

  return h(
    'div',
    { className: 'border-t border-border/30 pt-1' },
    h(
      'div',
      {
        className: 'overflow-y-auto min-h-0',
        style: {
          maxHeight: '60vh',
          scrollbarWidth: 'thin',
          scrollbarGutter: 'stable',
        },
      },
      h(
        'div',
        {
          className: 'w-full min-w-0',
          style: {
            minHeight: '16rem',
            height: `${chartHeight}px`,
          },
        },
        h(
          ResponsiveContainer,
          { width: '100%', height: '100%' },
          h(
            Sankey,
            {
              data: sankeyData,
              margin: { top: 10, right: 20, bottom: 10, left: 20 },
              nodePadding: viewState.modeShareLayout === ModeLayout.All ? 18 : 14,
              nodeWidth: 12,
              sort: false,
              link: buildSankeyLinkRenderer(h),
            },
            h(Tooltip, {
              content: buildSankeyTooltipRenderer(h),
              wrapperStyle: { outline: 'none' },
            }),
          ),
        ),
      ),
    ),
  );
}

function resolveSankeyCharts(): SankeyCharts | null {
  const charts = window.SubwayBuilderAPI?.utils?.charts as
    | unknown
    | undefined;
  const chartRecord = charts as Record<string, unknown> | undefined;

  const ResponsiveContainer = chartRecord?.ResponsiveContainer as
    | ComponentType<any>
    | undefined;
  const Sankey = chartRecord?.Sankey as ComponentType<any> | undefined;
  const Tooltip = chartRecord?.Tooltip as ComponentType<any> | undefined;

  if (!ResponsiveContainer || !Sankey || !Tooltip) {
    return null;
  }
  return { ResponsiveContainer, Sankey, Tooltip };
}

function buildSankeyData(
  activeRegionName: string,
  byRegionModeShare: Map<string, ModeShare>,
  viewState: CommutersViewState,
): SankeyData | null {
  const entries = getTopFlowEntries(byRegionModeShare);
  if (entries.length === 0) {
    return null;
  }

  const nodes: SankeyNodeData[] = [
    {
      name: activeRegionName,
      role: 'active',
      fill: SANKEY_NODE_COLOR.active,
    },
  ];
  const nodeIndexByName = new Map<string, number>([[activeRegionName, 0]]);
  const links: SankeyLinkData[] = [];

  entries.forEach((entry) => {
    const targetLabel =
      entry.regionName === activeRegionName
        ? `${entry.regionName} (Within Region)`
        : entry.regionName;
    const targetIndex = getOrCreateNodeIndex(
      nodes,
      nodeIndexByName,
      targetLabel,
      entry.isAggregated ? 'others' : 'region',
    );

    const sourceIndex =
      viewState.direction === CommuterDirection.Outbound ? 0 : targetIndex;
    const sinkIndex =
      viewState.direction === CommuterDirection.Outbound ? targetIndex : 0;
    const sourceName =
      viewState.direction === CommuterDirection.Outbound
        ? activeRegionName
        : targetLabel;
    const targetName =
      viewState.direction === CommuterDirection.Outbound
        ? targetLabel
        : activeRegionName;

    links.push(
      ...createLinksForEntry(
        entry,
        sourceIndex,
        sinkIndex,
        sourceName,
        targetName,
        viewState.modeShareLayout,
      ),
    );
  });

  return { nodes, links };
}

function getTopFlowEntries(byRegionModeShare: Map<string, ModeShare>): FlowEntry[] {
  const sortedEntries = Array.from(byRegionModeShare.entries())
    .map(([regionName, modeShare]) => ({
      regionName,
      modeShare,
      total: ModeShare.total(modeShare),
    }))
    .filter((entry) => entry.total > 0)
    .sort((a, b) => {
      if (a.total === b.total) {
        return a.regionName.localeCompare(b.regionName);
      }
      return b.total - a.total;
    });

  if (sortedEntries.length === 0) {
    return [];
  }

  const entries: FlowEntry[] = sortedEntries
    .slice(0, SANKEY_TOP_FLOW_COUNT)
    .map(({ regionName, modeShare }) => ({
      regionName,
      modeShare,
      isAggregated: false,
    }));

  if (sortedEntries.length <= SANKEY_TOP_FLOW_COUNT) {
    return entries;
  }

  const remainingTotal = ModeShare.createEmpty();
  sortedEntries.slice(SANKEY_TOP_FLOW_COUNT).forEach(({ modeShare }) => {
    ModeShare.addInPlace(remainingTotal, modeShare);
  });

  if (ModeShare.total(remainingTotal) > 0) {
    entries.push({
      regionName: ALL_OTHERS_LABEL,
      modeShare: remainingTotal,
      isAggregated: true,
    });
  }

  return entries;
}

function getOrCreateNodeIndex(
  nodes: SankeyNodeData[],
  nodeIndexByName: Map<string, number>,
  nodeName: string,
  role: SankeyNodeRole,
): number {
  const existingIndex = nodeIndexByName.get(nodeName);
  if (existingIndex !== undefined) {
    return existingIndex;
  }

  const index = nodes.length;
  nodeIndexByName.set(nodeName, index);
  nodes.push({
    name: nodeName,
    role,
    fill:
      role === 'active'
        ? SANKEY_NODE_COLOR.active
        : role === 'others'
          ? SANKEY_NODE_COLOR.others
          : SANKEY_NODE_COLOR.region,
  });
  return index;
}

function createLinksForEntry(
  entry: FlowEntry,
  source: number,
  target: number,
  sourceName: string,
  targetName: string,
  layout: ModeLayout,
): SankeyLinkData[] {
  const total = ModeShare.total(entry.modeShare);
  if (total <= 0) {
    return [];
  }

  if (layout === ModeLayout.All) {
    const byMode: Array<{
      mode: SankeyLinkMode;
      value: number;
      color: string;
    }> = [
      {
        mode: 'transit',
        value: entry.modeShare.transit,
        color: SANKEY_MODE_COLOR.transit,
      },
      {
        mode: 'driving',
        value: entry.modeShare.driving,
        color: SANKEY_MODE_COLOR.driving,
      },
      {
        mode: 'walking',
        value: entry.modeShare.walking,
        color: SANKEY_MODE_COLOR.walking,
      },
    ];

    return byMode
      .filter((modeData) => modeData.value > 0)
      .map((modeData) =>
        buildSankeyLink(
          source,
          target,
          modeData.value,
          modeData.mode,
          modeData.color,
          entry,
          sourceName,
          targetName,
        ),
      );
  }

  return [
    buildSankeyLink(
      source,
      target,
      total,
      'mixed',
      getMixedModeColor(entry.modeShare),
      entry,
      sourceName,
      targetName,
    ),
  ];
}

function buildSankeyLink(
  source: number,
  target: number,
  value: number,
  mode: SankeyLinkMode,
  color: string,
  entry: FlowEntry,
  sourceName: string,
  targetName: string,
): SankeyLinkData {
  return {
    source,
    target,
    value,
    mode,
    color,
    transit: entry.modeShare.transit,
    driving: entry.modeShare.driving,
    walking: entry.modeShare.walking,
    unknown: entry.modeShare.unknown,
    total: ModeShare.total(entry.modeShare),
    isAggregated: entry.isAggregated,
    sourceName,
    targetName,
  };
}

function getMixedModeColor(modeShare: ModeShare): string {
  const knownTotal = modeShare.transit + modeShare.driving + modeShare.walking;
  if (knownTotal <= 0) {
    return SANKEY_MODE_COLOR.neutral;
  }

  const minChannel = 32;
  const range = 192;
  const red = Math.round(minChannel + (modeShare.driving / knownTotal) * range);
  const green = Math.round(
    minChannel + (modeShare.walking / knownTotal) * range,
  );
  const blue = Math.round(minChannel + (modeShare.transit / knownTotal) * range);
  return `rgb(${red}, ${green}, ${blue})`;
}

function buildSankeyLinkRenderer(
  h: typeof createElement,
): ComponentType<any> {
  return function SankeyLinkShape(props: unknown): ReactNode {
    const shape = props as Record<string, unknown>;
    const sourceX = Number(shape.sourceX);
    const sourceY = Number(shape.sourceY);
    const targetX = Number(shape.targetX);
    const targetY = Number(shape.targetY);
    const sourceControlX = Number(shape.sourceControlX);
    const targetControlX = Number(shape.targetControlX);
    const width = Math.max(1, Number(shape.linkWidth) || 1);

    if (
      Number.isNaN(sourceX) ||
      Number.isNaN(sourceY) ||
      Number.isNaN(targetX) ||
      Number.isNaN(targetY)
    ) {
      return null;
    }

    const controlLeft = Number.isNaN(sourceControlX)
      ? sourceX + (targetX - sourceX) * 0.35
      : sourceControlX;
    const controlRight = Number.isNaN(targetControlX)
      ? sourceX + (targetX - sourceX) * 0.65
      : targetControlX;
    const pathData = `M${sourceX},${sourceY}C${controlLeft},${sourceY} ${controlRight},${targetY} ${targetX},${targetY}`;
    const payload = shape.payload as SankeyLinkData | undefined;

    return h('path', {
      d: pathData,
      fill: 'none',
      stroke: payload?.color ?? SANKEY_MODE_COLOR.neutral,
      strokeOpacity: 0.72,
      strokeWidth: width,
      vectorEffect: 'non-scaling-stroke',
    });
  };
}

function buildSankeyTooltipRenderer(
  h: typeof createElement,
): ComponentType<any> {
  return function SankeyTooltip(props: unknown): ReactNode {
    const tooltip = props as {
      active?: boolean;
      payload?: Array<{ payload?: SankeyLinkData }>;
    };
    if (!tooltip.active) return null;

    const linkData = tooltip.payload?.[0]?.payload;
    if (!linkData) return null;

    const total = linkData.total;
    const safeTotal = Math.max(total, 1);
    const modeLabel =
      linkData.mode === 'mixed'
        ? 'All Modes'
        : `${linkData.mode[0].toUpperCase()}${linkData.mode.slice(1)}`;

    return h(
      'div',
      {
        className:
          'rounded-md border border-border/80 bg-background/95 px-2 py-1.5 text-[0.68rem] shadow-md',
      },
      h(
        'div',
        { className: 'font-semibold text-foreground pb-1' },
        `${linkData.sourceName} -> ${linkData.targetName}`,
      ),
      h(
        'div',
        { className: 'text-foreground/90' },
        `${modeLabel}: ${formatNumberOrDefault(linkData.value)} commuters`,
      ),
      h(
        'div',
        { className: 'text-muted-foreground' },
        `Transit: ${formatNumberOrDefault(linkData.transit)} (${formatPercentOrDefault((linkData.transit / safeTotal) * 100)})`,
      ),
      h(
        'div',
        { className: 'text-muted-foreground' },
        `Driving: ${formatNumberOrDefault(linkData.driving)} (${formatPercentOrDefault((linkData.driving / safeTotal) * 100)})`,
      ),
      h(
        'div',
        { className: 'text-muted-foreground' },
        `Walking: ${formatNumberOrDefault(linkData.walking)} (${formatPercentOrDefault((linkData.walking / safeTotal) * 100)})`,
      ),
      h(
        'div',
        { className: 'text-muted-foreground' },
        `Unknown: ${formatNumberOrDefault(linkData.unknown)} (${formatPercentOrDefault((linkData.unknown / safeTotal) * 100)})`,
      ),
      linkData.isAggregated
        ? h(
            'div',
            { className: 'pt-1 text-muted-foreground/90 italic' },
            'Aggregated flow (All Others)',
          )
        : null,
    );
  };
}
