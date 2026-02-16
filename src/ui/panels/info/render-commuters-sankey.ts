import type { createElement, ReactNode } from 'react';
import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from 'recharts';

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

const SANKEY_MODE_COLOR = {
  transit: '#0000ff',
  driving: '#ff0000',
  walking: '#00ff00',
  neutral: '#64748b',
} as const;

const SANKEY_NODE_COLOR = {
  active: '#94a3b8',
  region: '#64748b',
  others: '#475569',
} as const;

const ALL_OTHERS_LABEL = 'All Others';

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

type SankeyNodeTooltipData = {
  name?: string;
  value?: number;
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

  const estimatedRowCount = Math.max(sankeyData.nodes.length, DEFAULT_TABLE_ROWS);
  const chartHeight = Math.max(
    280,
    Math.min(
      560,
      estimatedRowCount *
        (viewState.modeShareLayout === ModeLayout.All ? 26 : 22),
    ),
  );
  const ResponsiveContainerComponent = ResponsiveContainer as any;
  const SankeyComponent = Sankey as any;
  const TooltipComponent = Tooltip as any;
  const chartMinWidth =
    viewState.modeShareLayout === ModeLayout.All ? '44rem' : '40rem';

  return h(
    'div',
    { className: 'border-t border-border/30 pt-1 w-full' },
    h(
      'div',
      {
        className: 'overflow-auto min-h-0 w-full',
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
            minWidth: '0',
            width: '100%',
            maxWidth: 'none',
            minInlineSize: chartMinWidth,
            minHeight: '16rem',
            height: `${chartHeight}px`,
          },
        },
        h(
          ResponsiveContainerComponent,
          { width: '100%', height: '100%', minWidth: 0, minHeight: chartHeight },
          h(
            SankeyComponent,
            {
              data: sankeyData,
              margin: { top: 16, right: 120, bottom: 16, left: 120 },
              nodePadding: viewState.modeShareLayout === ModeLayout.All ? 18 : 14,
              nodeWidth: 12,
              sort: false,
              node: buildSankeyNodeRenderer(
                h,
                viewState,
                gameData.displayName,
              ),
              link: buildSankeyLinkRenderer(h),
            },
            h(TooltipComponent, {
              content: buildSankeyTooltipRenderer(h),
              wrapperStyle: { outline: 'none' },
            }),
          ),
        ),
      ),
    ),
  );
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

  const red = Math.round((modeShare.driving / knownTotal) * 255);
  const green = Math.round((modeShare.walking / knownTotal) * 255);
  const blue = Math.round((modeShare.transit / knownTotal) * 255);
  return `rgb(${red}, ${green}, ${blue})`;
}

function buildSankeyNodeRenderer(
  h: typeof createElement,
  viewState: CommutersViewState,
  activeRegionName: string,
): (props: unknown) => ReactNode {
  return function SankeyNodeShape(props: unknown): ReactNode {
    const shape = props as Record<string, unknown>;
    const payload = shape.payload as
      | (SankeyNodeTooltipData & { depth?: number })
      | undefined;
    const x = Number(shape.x);
    const y = Number(shape.y);
    const width = Number(shape.width);
    const height = Number(shape.height);

    if (
      !payload ||
      Number.isNaN(x) ||
      Number.isNaN(y) ||
      Number.isNaN(width) ||
      Number.isNaN(height)
    ) {
      return null;
    }

    const nodeName = payload.name ?? '';
    const depth = payload.depth ?? 0;
    const isLeftNode = depth === 0;
    const isActiveNode = nodeName === activeRegionName;
    const labelText = isActiveNode
      ? `${
          viewState.direction === CommuterDirection.Outbound
            ? 'Origin'
            : 'Destination'
        }: ${nodeName}`
      : nodeName;
    const labelX = isLeftNode ? x + width + 8 : x - 8;
    const textAnchor = isLeftNode ? 'start' : 'end';
    const nodeFill = isActiveNode
      ? SANKEY_NODE_COLOR.active
      : payload.name === ALL_OTHERS_LABEL
        ? SANKEY_NODE_COLOR.others
        : SANKEY_NODE_COLOR.region;

    return h(
      'g',
      null,
      h('rect', {
        x,
        y,
        width,
        height,
        fill: nodeFill,
        fillOpacity: isActiveNode ? 0.95 : 0.8,
      }),
      h(
        'text',
        {
          x: labelX,
          y: y + height / 2,
          fill: isActiveNode ? '#f8fafc' : '#cbd5e1',
          fontSize: isActiveNode ? 11 : 10,
          fontWeight: isActiveNode ? 700 : 500,
          alignmentBaseline: 'middle',
          dominantBaseline: 'middle',
          textAnchor,
        },
        labelText,
      ),
    );
  };
}

function buildSankeyLinkRenderer(
  h: typeof createElement,
): (props: unknown) => any {
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
      strokeOpacity: 0.78,
      strokeWidth: width,
      vectorEffect: 'non-scaling-stroke',
    });
  };
}

function buildSankeyTooltipRenderer(
  h: typeof createElement,
): (props: unknown) => any {
  return function SankeyTooltip(props: unknown): ReactNode {
    const tooltip = props as {
      active?: boolean;
      payload?: Array<{ payload?: SankeyLinkData }>;
    };
    if (!tooltip.active) return null;

    const firstPayload = tooltip.payload?.[0];
    if (!firstPayload) return null;
    const rawPayload = (firstPayload as { payload?: unknown }).payload;
    const tooltipData = (rawPayload ?? firstPayload) as unknown;

    if (!isSankeyLinkData(tooltipData)) {
      const nodeData = tooltipData as SankeyNodeTooltipData | undefined;
      if (!nodeData || typeof nodeData.name !== 'string') {
        return null;
      }
      const nodeValue =
        typeof nodeData.value === 'number'
          ? nodeData.value
          : typeof (firstPayload as { value?: unknown }).value === 'number'
            ? ((firstPayload as { value?: number }).value ?? 0)
            : 0;

      return h(
        'div',
        {
          className:
            'rounded-md border border-border/80 bg-background/95 px-2 py-1.5 text-[0.68rem] shadow-md',
        },
        h('div', { className: 'font-semibold text-foreground pb-1' }, nodeData.name),
        h(
          'div',
          { className: 'text-foreground/90' },
          `Flow volume: ${formatNumberOrDefault(nodeValue)}`,
        ),
      );
    }
    const linkData = tooltipData;

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

function isSankeyLinkData(value: unknown): value is SankeyLinkData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.mode === 'string' &&
    typeof data.sourceName === 'string' &&
    typeof data.targetName === 'string' &&
    typeof data.value === 'number'
  );
}
