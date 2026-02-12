type SVGNode =
  | { tag: 'path'; d: string }
  | {
      tag: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
    };

export interface IconDefinition {
  nodes: SVGNode[];
  viewBox?: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createIconElement(
  icon: IconDefinition,
  options?: {
    size?: number;
    className?: string;
  },
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
