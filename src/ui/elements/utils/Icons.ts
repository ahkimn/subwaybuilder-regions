import type { createElement, ReactNode } from 'react';

type SVGNode =
  | { tag: 'path'; d: string; strokeWidth?: string; strokeLinecap?: string }
  | {
      tag: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
    }
  | { tag: 'circle'; cx: number; cy: number; r: number };

export interface IconDefinition {
  nodes: SVGNode[];
  viewBox?: string;
}

export interface IconRenderOptions {
  size?: number;
  className?: string;
  transform?: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createIconElement(
  icon: IconDefinition,
  options?: IconRenderOptions,
): SVGElement {
  const { size = 24, className = 'h-4 w-4 shrink-0' } = options ?? {};

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', icon.viewBox ?? '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  if (className) {
    svg.setAttribute('class', className);
  }
  if (options?.transform) {
    svg.style.transform = options.transform;
  }

  for (const node of icon.nodes) {
    const el = document.createElementNS(SVG_NS, node.tag);

    // Assign attributes safely
    for (const [key, value] of Object.entries(node)) {
      if (key === 'tag') continue;
      el.setAttribute(key, String(value));
    }

    svg.appendChild(el);
  }

  return svg;
}

export function createReactIconElement(
  h: typeof createElement,
  icon: IconDefinition,
  options?: IconRenderOptions,
): ReactNode {
  const { size = 24, className = 'h-4 w-4 shrink-0' } = options ?? {};

  return h(
    'svg',
    {
      xmlns: SVG_NS,
      viewBox: icon.viewBox ?? '0 0 24 24',
      width: size,
      height: size,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className,
      style: options?.transform ? { transform: options.transform } : undefined,
    },
    icon.nodes.map((node, index) => {
      if (node.tag === 'path') {
        return h('path', {
          key: `path-${index}`,
          d: node.d,
        });
      } else if (node.tag === 'circle') {
        return h('circle', {
          key: `circle-${index}`,
          cx: node.cx,
          cy: node.cy,
          r: node.r,
        });
      }

      return h('rect', {
        key: `rect-${index}`,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        rx: node.rx,
      });
    }),
  );
}

export const CheckboxIcon: IconDefinition = {
  nodes: [{ tag: 'path', d: 'M20 6 9 17l-5-5' }],
};

export const CloseIcon: IconDefinition = {
  nodes: [
    { tag: 'path', d: 'M18 6 6 18' },
    { tag: 'path', d: 'm6 6 12 12' },
  ],
};

export const RefreshIcon: IconDefinition = {
  nodes: [
    { tag: 'path', d: 'M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' },
    { tag: 'path', d: 'M3 3v5h5' },
    { tag: 'path', d: 'M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16' },
    { tag: 'path', d: 'M16 16h5v5' },
  ],
};

export const TramFrontIcon: IconDefinition = {
  nodes: [
    { tag: 'rect', x: 4, y: 3, width: 16, height: 16, rx: 2 },
    { tag: 'path', d: 'M4 11h16' },
    { tag: 'path', d: 'M12 3v8' },
    { tag: 'path', d: 'm8 19-2 3' },
    { tag: 'path', d: 'm18 22-2-3' },
    { tag: 'path', d: 'M8 15h.01' },
    { tag: 'path', d: 'M16 15h.01' },
  ],
};

export const FileChartColumnIcon: IconDefinition = {
  nodes: [
    {
      tag: 'path',
      d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
    },
    { tag: 'path', d: 'M14 2v5a1 1 0 0 0 1 1h5' },
    { tag: 'path', d: 'M8 18v-1' },
    { tag: 'path', d: 'M12 18v-6' },
    { tag: 'path', d: 'M16 18v-3' },
  ],
};

export const ChevronDownIcon: IconDefinition = {
  nodes: [{ tag: 'path', d: 'm6 9 6 6 6-6' }],
};

export const ChevronUpIcon: IconDefinition = {
  nodes: [{ tag: 'path', d: 'm18 15-6-6-6 6' }],
};

export const Arrow: IconDefinition = {
  nodes: [
    {
      tag: 'path',
      d: 'M12 4L20 12L12 20',
      strokeWidth: '4',
      strokeLinecap: 'butt',
    },
    {
      tag: 'path',
      d: 'M4 12H18',
      strokeWidth: '4',
      strokeLinecap: 'square',
    },
  ],
};

export const MapPinnedIcon: IconDefinition = {
  nodes: [
    {
      tag: 'path',
      d: 'M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0',
    },
    { tag: 'circle', cx: 12, cy: 8, r: 2 },
    {
      tag: 'path',
      d: 'M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712',
    },
  ],
};

export const TriangleWarning: IconDefinition = {
  nodes: [
    {
      tag: 'path',
      d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
    },
    { tag: 'path', d: 'M12 9v4' },
    { tag: 'path', d: 'M12 17h.01' },
  ],
};

export const OctagonX: IconDefinition = {
  nodes: [
    {
      tag: 'path',
      d: 'M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z',
    },
    { tag: 'path', d: 'm9 9 6 6' },
    { tag: 'path', d: 'm15 9-6 6' },
  ],
};
