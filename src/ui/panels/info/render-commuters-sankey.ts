import {
  type createElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Sankey, Tooltip } from 'recharts';

import { UNASSIGNED_REGION_ID } from '../../../core/constants';
import type { ModeKey } from '../../../core/types';
import {
  MODE_LABEL,
  MODE_ORDER,
  ModeShare,
  type RegionGameData,
} from '../../../core/types';
import {
  formatNumberOrDefault,
  formatPercentOrDefault,
} from '../../../core/utils';
import {
  BLACK,
  getPrimaryChartColorByName,
  hexToRgb,
  rgbToHex,
  SANKEY_TERMINAL_NODE_COLOR,
  WHITE,
} from '../../types/DisplayColor';
import { CommuterDirection, type CommutersViewState } from './types';

const SANKEY_MIN_WIDTH_PX = 720;
const SANKEY_EMPTY_MESSAGE = 'No commuter flow data available';
const ALL_OTHERS_LABEL = 'Other Regions';
const LABEL_OFFSET = 6;
const LABEL_TITLE_FONT_SIZE = 10;
const LABEL_SUBTITLE_FONT_SIZE = 9;
const LABEL_ROW_GAP = 2;
const LABEL_GAP_BETWEEN_NODES = 2;
const LABEL_TOP_PADDING = 2;
const LABEL_BOTTOM_PADDING = 2;
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

type SankeyNodeType = 'selected' | 'region' | 'others' | 'mode';

type SankeyNodeData = {
  name: string;
  nodeType: SankeyNodeType;
  mode?: ModeKey;
  tooltipBubbleColor?: string;
};

type SankeyLinkData = {
  tooltipKind: 'sankey-link';
  source: number;
  sourceName: string;
  target: number;
  targetName: string;
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

type SankeyRenderOptions = {
  labelsFollowFlowDirection: boolean;
  topFlowCount: number;
  colorNodesByModeShare: boolean;
};

export function renderCommutersSankey(
  h: typeof createElement,
  gameData: RegionGameData,
  viewState: CommutersViewState,
  byRegionModeShare: Map<string | number, ModeShare>,
  resolveRegionName: (regionId: string | number) => string,
  options: SankeyRenderOptions,
): ReactNode {

  const sankeyData = buildSankeyData(
    gameData.displayName,
    byRegionModeShare,
    viewState.direction,
    resolveRegionName,
    options.topFlowCount,
    options.colorNodesByModeShare,
  );

  if (sankeyData === null || sankeyData.links.length === 0) {
    return h(
      'div',
      {
        className:
          'rounded-md border border-border/60 px-2 py-3 text-xs text-muted-foreground',
      },
      SANKEY_EMPTY_MESSAGE,
    );
  }

  const maxRows = Math.max(12, sankeyData.nodes.length);
  // Calculate expected height of the sankey to set a minimum bound for the size of its container
  const chartHeight = Math.max(320, Math.min(620, maxRows * 26));

  return h(
    'div',
    { className: 'border-t border-border/30 pt-1 w-full' },
    h(
      'div',
      {
        className: 'overflow-auto min-h-0 w-full',
        style: {
          maxHeight: '60vh',
          // Likely unneeded as the sankey should never be tall enough to require scrolling
          scrollbarWidth: 'thin',
          scrollbarGutter: 'stable both-edges',
        },
      },
      h(SankeyCanvas, {
        h,
        sankeyData,
        chartHeight,
        direction: viewState.direction,
        labelsFollowFlowDirection: options.labelsFollowFlowDirection,
        colorNodesByModeShare: options.colorNodesByModeShare,
      } satisfies SankeyCanvasProps),
    ),
  );
}

type SankeyCanvasProps = {
  h: typeof createElement;
  sankeyData: SankeyData;
  chartHeight: number;
  direction: CommuterDirection;
  labelsFollowFlowDirection: boolean;
  colorNodesByModeShare: boolean;
};

// Thin wrapper class around the Sankey chart component to handle dynamic resizing (most notably on the initial render when we do not know the width of the container)
function SankeyCanvas({
  h,
  sankeyData,
  chartHeight,
  direction,
  labelsFollowFlowDirection,
  colorNodesByModeShare,
}: SankeyCanvasProps): ReactNode {
  const containerRef = useRef<HTMLElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);
  const renderLabelsOnLeft =
    labelsFollowFlowDirection && direction === CommuterDirection.Inbound;

  // Horizontal padding is greater on the side the labels are intended to be rendered on
  const sankeyMargins = renderLabelsOnLeft
    ? { top: 10, right: 10, bottom: 10, left: 108 }
    : { top: 10, right: 108, bottom: 10, left: 10 };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const nextWidth = Math.max(container.clientWidth, SANKEY_MIN_WIDTH_PX);
      setChartWidth((current) => (current === nextWidth ? current : nextWidth));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  return h(
    'div',
    {
      ref: (node: HTMLElement | null) => {
        containerRef.current = node;
      },
      className: 'w-full min-w-0',
      style: {
        minWidth: `${SANKEY_MIN_WIDTH_PX}px`,
        height: `${chartHeight}px`,
      },
    },
    chartWidth > 0
      ? h(
        Sankey as any,
        {
          width: chartWidth,
          height: chartHeight,
          data: sankeyData,
          margin: sankeyMargins,
          nodePadding: 18,
          nodeWidth: 14,
          sort: false,
          node: buildSankeyNodeRenderer(
            h,
            chartWidth,
            chartHeight,
            renderLabelsOnLeft,
            colorNodesByModeShare,
          ),
          link: buildSankeyLinkRenderer(h, hoveredLinkIndex, setHoveredLinkIndex),
          onMouseLeave: () => setHoveredLinkIndex(null),
        },
        h(Tooltip as any, {
          content: buildSankeyTooltipRenderer(
            h,
            sankeyData.totalCommuters,
          ),
          wrapperStyle: { outline: 'none' },
          isAnimationActive: false,
          animationDuration: 0,
          offset: 8,
        }),
      )
      : null,
  );
}

function buildSankeyData(
  selectedRegionName: string,
  byRegionModeShare: Map<string | number, ModeShare>,
  direction: CommuterDirection,
  resolveRegionName: (regionId: string | number) => string,
  topFlowCount: number,
  _colorNodesByModeShare: boolean,
): SankeyData | null {
  const displayFlows = getTopFlows(byRegionModeShare, resolveRegionName, topFlowCount);
  const activeModes = getActiveModes(displayFlows);

  if (displayFlows.length === 0 && activeModes.length === 0) {
    return null;
  }
  const totalModeShare = calculateTotalModeShare(displayFlows);
  const totalCommuters = ModeShare.total(totalModeShare);

  const nodes: SankeyNodeData[] = [];
  const links: SankeyLinkData[] = [];

  const nodeIndexByKey = new Map<string, number>();

  // Build index of nodes (necessary for the Sankey to construct links)
  const addNode = (
    key: string,
    name: string,
    kind: SankeyNodeType,
    mode?: ModeKey,
    tooltipBubbleColor?: string,
  ) => {
    const existing = nodeIndexByKey.get(key);
    if (existing !== undefined) return existing;
    const index = nodes.length;
    nodeIndexByKey.set(key, index);
    nodes.push({ name, nodeType: kind, mode, tooltipBubbleColor });
    return index;
  };

  // Add nodes for the individual transit modes (to be displayed in the middle of the Sankey)
  const modeNodeIndex: Partial<Record<ModeKey, number>> = {};
  activeModes.forEach((mode) => {
    modeNodeIndex[mode] = addNode(`mode:${mode}`, MODE_LABEL[mode], 'mode', mode);
  });

  // Add node for the selected region (to be displayed on the left or right of the Sankey depending on flow direction)
  const selectedNodeIndex = addNode(
    `selected:${selectedRegionName}`,
    selectedRegionName,
    'selected',
    undefined,
    getModeShareBubbleColor(totalModeShare),
  );
  const regionNodeIndex = new Map<string | number, number>();
  displayFlows.forEach((entry) => {
    regionNodeIndex.set(
      entry.regionId,
      addNode(
        `region:${String(entry.regionId)}`,
        entry.regionName,
        entry.isAggregate ? 'others' : 'region',
        undefined,
        getModeShareBubbleColor(entry.modeShare),
      ),
    );
  });

  if (direction === CommuterDirection.Outbound) {
    activeModes.forEach((mode) => {
      const modeTotal = displayFlows.reduce(
        (sum, entry) => sum + entry.modeShare[mode],
        0,
      );
      links.push({
        tooltipKind: 'sankey-link',
        source: selectedNodeIndex,
        target: modeNodeIndex[mode]!,
        value: modeTotal,
        mode,
        displayColor: SANKEY_MODE_COLOR_MUTED[mode],
        sourceName: selectedRegionName,
        targetName: MODE_LABEL[mode],
        displayName: selectedRegionName,
        displayTotal: totalCommuters,
      });
    });
    displayFlows.forEach((entry) => {
      activeModes.forEach((mode) => {
        const value = entry.modeShare[mode];
        links.push({
          tooltipKind: 'sankey-link',
          source: modeNodeIndex[mode]!,
          target: regionNodeIndex.get(entry.regionId)!,
          value,
          mode,
          displayColor: SANKEY_MODE_COLOR_MUTED[mode],
          sourceName: MODE_LABEL[mode],
          targetName: entry.regionName,
          displayName: entry.regionName,
          displayTotal: entry.total,
        });
      });
    });
  } else {
    displayFlows.forEach((entry) => {
      activeModes.forEach((mode) => {
        const value = entry.modeShare[mode];
        links.push({
          tooltipKind: 'sankey-link',
          source: regionNodeIndex.get(entry.regionId)!,
          target: modeNodeIndex[mode]!,
          value,
          mode,
          displayColor: SANKEY_MODE_COLOR_MUTED[mode],
          sourceName: entry.regionName,
          targetName: MODE_LABEL[mode],
          displayName: entry.regionName,
          displayTotal: entry.total,
        });
      });
    });
    activeModes.forEach((mode) => {
      const modeTotal = displayFlows.reduce(
        (sum, entry) => sum + entry.modeShare[mode],
        0,
      );
      links.push({
        tooltipKind: 'sankey-link',
        source: modeNodeIndex[mode]!,
        target: selectedNodeIndex,
        value: modeTotal,
        mode,
        displayColor: SANKEY_MODE_COLOR_MUTED[mode],
        sourceName: MODE_LABEL[mode],
        targetName: selectedRegionName,
        displayName: selectedRegionName,
        displayTotal: totalCommuters,
      });
    });
  }

  return { nodes, links, totalCommuters: totalCommuters };
}

function getTopFlows(
  byRegionModeShare: Map<string | number, ModeShare>,
  resolveRegionName: (regionId: string | number) => string,
  topFlowCount: number,
): FlowParams[] {
  if (byRegionModeShare.size === 0) {
    return [];
  }

  const sortedRegions = Array.from(byRegionModeShare.entries())
    .map(([regionId, modeShare]) => ({
      regionId,
      regionName: resolveRegionName(regionId),
      modeShare,
      total: ModeShare.total(modeShare),
    }))
    .filter((entry) => entry.total > 0)
    .sort((a, b) => {
      // If totals are equal, apply a tiebreaker based on region name and then feature ID.
      if (a.total === b.total) {
        const nameCompare = a.regionName.localeCompare(b.regionName);
        if (nameCompare !== 0) return nameCompare;
        return String(a.regionId).localeCompare(String(b.regionId));
      }
      return b.total - a.total;
    });

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

function getActiveModes(entries: FlowParams[]): ModeKey[] {
  return MODE_ORDER.filter((mode) =>
    entries.some((entry) => entry.modeShare[mode] > 0),
  );
}

function calculateTotalModeShare(entries: FlowParams[]): ModeShare {
  const totalModeShare = ModeShare.createEmpty();
  entries.forEach((entry) => ModeShare.addInPlace(totalModeShare, entry.modeShare));
  return totalModeShare;
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
  colorNodesByModeShare: boolean,
): (props: unknown) => ReactNode {
  const lastLabelBottomByDepth = new Map<number, number>();

  return function SankeyNodeShape(props: unknown): ReactNode {
    const shape = props as Record<string, unknown>;
    const payload = shape.payload as NodeRenderPayload;
    const x = Number(shape.x);
    const y = Number(shape.y);
    const width = Number(shape.width);
    const height = Number(shape.height);

    const isModeNode = payload.nodeType === 'mode';
    const isSelectedNode = payload.nodeType === 'selected';

    const nodeFill = isModeNode
      ? SANKEY_MODE_NODE_COLOR[payload.mode!]
      : colorNodesByModeShare && payload.tooltipBubbleColor
        ? payload.tooltipBubbleColor
        : SANKEY_TERMINAL_NODE_COLOR;

    const countLabel = `${formatNumberOrDefault(payload.value)} commuters`;
    const textX = renderLabelsOnLeft ? x - LABEL_OFFSET : x + width + LABEL_OFFSET;
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

    const centeredTop = y + height / 2 - fullBlockHeight / 2;
    const depthKey = payload.depth ?? 0;
    const previousBottom = lastLabelBottomByDepth.get(depthKey) ?? -Infinity;
    const minTop = previousBottom + LABEL_GAP_BETWEEN_NODES;
    const maxTopWithSubtitle =
      chartHeight - fullBlockHeight - LABEL_BOTTOM_PADDING;
    let blockTop = Math.max(centeredTop, minTop, LABEL_TOP_PADDING);
    let showSubtitle = true;
    let blockHeight = fullBlockHeight;

    if (blockTop > maxTopWithSubtitle) {
      showSubtitle = false;
      blockHeight = singleBlockHeight;
      const centeredSingleTop = y + height / 2 - singleBlockHeight / 2;
      const maxTopSingle =
        chartHeight - singleBlockHeight - LABEL_BOTTOM_PADDING;
      blockTop = Math.min(
        Math.max(centeredSingleTop, minTop, LABEL_TOP_PADDING),
        maxTopSingle,
      );
    }

    lastLabelBottomByDepth.set(depthKey, blockTop + blockHeight);

    const titleY = blockTop + LABEL_TITLE_FONT_SIZE * 0.78;
    const subtitleY =
      titleY + LABEL_ROW_GAP + LABEL_SUBTITLE_FONT_SIZE * 0.92;

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
          fill: WHITE,
          fontSize: LABEL_TITLE_FONT_SIZE,
          fontWeight: isSelectedNode ? 700 : isModeNode ? 600 : 500,
          alignmentBaseline: 'central',
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
            fill: WHITE,
            fillOpacity: 0.72,
            fontSize: LABEL_SUBTITLE_FONT_SIZE,
            fontWeight: 500,
            alignmentBaseline: 'central',
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
    const strokeOpacity = hasHoveredLink
      ? isHoveredLink
        ? 0.90
        : 0.2
      : 0.55;
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
  lineA: string,
  lineB: string,
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
      { className: 'flex items-center gap-1.5 text-foreground font-semibold text-sm pb-1' },
      modeColor
        ? h('span', {
          className: 'inline-block h-2 w-2 rounded-full shrink-0',
          style: { backgroundColor: modeColor },
        })
        : null,
      title,
    ),
    h('div', { className: 'text-foreground/90' }, lineA),
    h('div', { className: 'text-muted-foreground pt-0.5' }, lineB),
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
      const linkShare = (linkData.value / linkData.displayTotal) * 100;
      return buildTooltipContainer(
        h,
        `${linkData.displayName} - ${MODE_LABEL[linkData.mode]}`,
        `${formatNumberOrDefault(linkData.value)} commuters`,
        `${formatPercentOrDefault(linkShare)} of ${linkData.displayName} commuters`,
        SANKEY_MODE_NODE_COLOR[linkData.mode],
      );
    }

    const nodeData = tooltipPayload as NodeRenderPayload;
    const nodeTotal = typeof nodeData.value === 'number' ? nodeData.value : 0;
    const nodeShare = (nodeTotal / totalCommuters) * 100;

    return buildTooltipContainer(
      h,
      nodeData.name,
      `${formatNumberOrDefault(nodeTotal)} commuters`,
      `${formatPercentOrDefault(nodeShare)} of all commuters`,
      nodeData.nodeType === 'mode'
        ? SANKEY_MODE_NODE_COLOR[nodeData.mode!]
        : nodeData.tooltipBubbleColor,
    );
  };
}
