import type { createElement, ReactNode } from 'react';

/**
 * A slider with labeled tick marks.
 *
 * Each tick has a numeric value and a display label (e.g. "Default" for 1.0).
 * The slider snaps to the nearest tick on change.
 */

export type SliderTick = {
  value: number;
  label: string;
};

export type LabeledSliderParams = {
  id: string;
  label: string;
  description?: string;
  value: number;
  ticks: SliderTick[];
  disabled?: boolean;
  onChange: (value: number) => void;
};

/**
 * Default ticks for demand-dot scaling sliders.
 */
export const DOT_SCALING_TICKS: SliderTick[] = [
  { value: 0.1, label: '0.1x' },
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.8, label: '0.8x' },
  { value: 1.0, label: 'Default' },
  { value: 1.5, label: '1.5x' },
  { value: 2.0, label: '2x' },
];

/**
 * Find the nearest tick index for a given value.
 */
function nearestTickIndex(ticks: SliderTick[], value: number): number {
  let bestIndex = 0;
  let bestDist = Math.abs(ticks[0].value - value);
  for (let i = 1; i < ticks.length; i++) {
    const dist = Math.abs(ticks[i].value - value);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex;
}

export function LabeledSlider(
  h: typeof createElement,
  params: LabeledSliderParams,
): ReactNode {
  const {
    id,
    label,
    description,
    value,
    ticks,
    disabled = false,
    onChange,
  } = params;

  const tickCount = ticks.length;
  const maxIndex = tickCount - 1;
  const currentIndex = nearestTickIndex(ticks, value);
  const currentTick = ticks[currentIndex];

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const idx = Number.parseInt(target.value, 10);
    if (idx >= 0 && idx < tickCount) {
      onChange(ticks[idx].value);
    }
  };

  return h('div', { className: 'flex flex-col gap-2' }, [
    // Label row
    h(
      'div',
      {
        key: 'header',
        className: 'flex items-center justify-between',
      },
      [
        h(
          'label',
          {
            key: 'lbl',
            htmlFor: id,
            className: 'text-sm font-medium text-foreground',
          },
          label,
        ),
        h(
          'span',
          {
            key: 'val',
            className: 'text-xs font-mono text-muted-foreground',
          },
          currentTick.label,
        ),
      ],
    ),

    // Description
    ...(description
      ? [
          h(
            'span',
            {
              key: 'desc',
              className: 'text-xs text-muted-foreground -mt-1',
            },
            description,
          ),
        ]
      : []),

    // Slider input
    h('input', {
      key: 'slider',
      id,
      type: 'range',
      min: 0,
      max: maxIndex,
      step: 1,
      value: currentIndex,
      disabled,
      onInput: handleInput,
      className:
        'w-full h-2 rounded-full appearance-none cursor-pointer ' +
        'bg-border accent-primary disabled:opacity-50 disabled:cursor-not-allowed',
    }),

    // Tick labels
    h(
      'div',
      {
        key: 'ticks',
        className: 'flex justify-between',
      },
      ticks.map((tick, idx) =>
        h(
          'span',
          {
            key: `t-${idx}`,
            className:
              'text-[10px] leading-none text-muted-foreground cursor-pointer hover:text-foreground transition-colors' +
              (idx === currentIndex
                ? ' font-semibold text-foreground'
                : ''),
            onClick: disabled ? undefined : () => onChange(tick.value),
          },
          tick.label,
        ),
      ),
    ),
  ]);
}
