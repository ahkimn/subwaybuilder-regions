import type { createElement, ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

  /**
   * `'snap'`  – the slider locks to tick values only (integer-step).
   * `'continuous'` – the slider interpolates between ticks via piecewise-linear mapping.
   *
   * @default 'snap'
   */
  mode?: 'snap' | 'continuous';

  /**
   * Number of discrete steps on the underlying HTML range input in continuous mode.
   * Higher = smoother drag but diminishing returns past ~200.
   * Ignored in snap mode.
   *
   * @default 200
   */
  resolution?: number;

  /**
   * Format an arbitrary numeric value for the header readout.
   * In snap mode the matched tick label is used, so this is only
   * called when the value does not exactly match a tick.
   *
   * @default (v) => `${v.toFixed(2)}x`
   */
  formatValue?: (value: number) => string;
};

// ---------------------------------------------------------------------------
// Tick presets
// ---------------------------------------------------------------------------

/** Default ticks for demand-dot scaling sliders. */
export const DOT_SCALING_TICKS: SliderTick[] = [
  { value: 0.1, label: '0.1x' },
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.8, label: '0.8x' },
  { value: 1.0, label: 'Default' },
  { value: 1.5, label: '1.5x' },
  { value: 2.0, label: '2x' },
];

// ---------------------------------------------------------------------------
// Piecewise-linear interpolation helpers (exported for reuse / testing)
// ---------------------------------------------------------------------------

const DEFAULT_FORMAT: (v: number) => string = (v) => `${v.toFixed(2)}x`;
const DEFAULT_RESOLUTION = 200;
const SNAP_TOLERANCE = 1e-9;

/** Find the tick index whose value is closest to `value`. */
export function nearestTickIndex(ticks: SliderTick[], value: number): number {
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

/**
 * Map a slider position (0 … resolution) to a domain value via
 * piecewise-linear interpolation between adjacent ticks.
 *
 * Ticks are assumed to be evenly spaced along the slider track, so each
 * inter-tick segment spans `resolution / (ticks.length - 1)` steps.
 */
export function positionToValue(
  position: number,
  ticks: SliderTick[],
  resolution: number,
): number {
  const maxIdx = ticks.length - 1;
  if (maxIdx === 0) return ticks[0].value;

  // Normalise to [0, maxIdx] (floating-point tick coordinate)
  const t = (position / resolution) * maxIdx;
  const lo = Math.max(0, Math.floor(t));
  const hi = Math.min(maxIdx, lo + 1);

  if (lo === hi) return ticks[lo].value;

  const frac = t - lo;
  return ticks[lo].value + frac * (ticks[hi].value - ticks[lo].value);
}

/**
 * Inverse of `positionToValue` – map a domain value back to a slider
 * position (0 … resolution).
 */
export function valueToPosition(
  value: number,
  ticks: SliderTick[],
  resolution: number,
): number {
  const maxIdx = ticks.length - 1;
  if (maxIdx === 0) return 0;

  // Clamp to tick range
  if (value <= ticks[0].value) return 0;
  if (value >= ticks[maxIdx].value) return resolution;

  // Find the segment that contains `value`
  for (let i = 0; i < maxIdx; i++) {
    const lo = ticks[i].value;
    const hi = ticks[i + 1].value;
    if (value >= lo && value <= hi) {
      const segLen = hi - lo;
      const frac = segLen === 0 ? 0 : (value - lo) / segLen;
      const t = i + frac; // floating tick coordinate
      return Math.round((t / maxIdx) * resolution);
    }
  }

  // Fallback (should be unreachable)
  return Math.round(
    (nearestTickIndex(ticks, value) / maxIdx) * resolution,
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
    mode = 'snap',
    resolution = DEFAULT_RESOLUTION,
    formatValue = DEFAULT_FORMAT,
  } = params;

  const tickCount = ticks.length;
  const maxIndex = tickCount - 1;
  const closestTickIdx = nearestTickIndex(ticks, value);

  // --- Snap mode state ---
  const isSnap = mode === 'snap';
  const snapIndex = isSnap ? closestTickIdx : -1;

  // --- Continuous mode state ---
  const sliderPosition = isSnap
    ? closestTickIdx
    : valueToPosition(value, ticks, resolution);

  // Is the current value exactly (within tolerance) on a tick?
  const exactTickIdx = ticks.findIndex(
    (t) => Math.abs(t.value - value) < SNAP_TOLERANCE,
  );
  const isOnTick = exactTickIdx !== -1;

  // Display value for the header readout
  const displayValue = isOnTick
    ? ticks[exactTickIdx].label
    : formatValue(value);

  // --- Input handler ---
  const handleInput = (event: Event) => {
    const raw = Number.parseFloat((event.target as HTMLInputElement).value);
    if (isSnap) {
      const idx = Math.round(raw);
      if (idx >= 0 && idx < tickCount) {
        onChange(ticks[idx].value);
      }
    } else {
      const mapped = positionToValue(raw, ticks, resolution);
      // Round to avoid floating-point dust (4 decimal places is plenty for scaling)
      onChange(Math.round(mapped * 1e4) / 1e4);
    }
  };

  return h('div', { className: 'flex flex-col gap-2' }, [
    // Label row
    h(
      'div',
      { key: 'header', className: 'flex items-center justify-between' },
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
          displayValue,
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

    // Slider + tick marks wrapper
    h(
      'div',
      { key: 'slider-wrap', className: 'relative w-full' },
      [
        // Tick mark lines (behind the slider)
        h(
          'div',
          {
            key: 'tick-marks',
            className: 'absolute inset-x-0 top-0 h-2 pointer-events-none',
            'aria-hidden': 'true',
          },
          ticks.map((_, idx) => {
            const pct = maxIndex === 0 ? 50 : (idx / maxIndex) * 100;
            const isActive = isSnap
              ? idx === snapIndex
              : idx === exactTickIdx;
            return h('span', {
              key: `tm-${idx}`,
              className:
                'absolute top-1/2 -translate-y-1/2 w-px rounded-full transition-colors ' +
                (isActive ? 'h-3 bg-primary' : 'h-2 bg-muted-foreground/40'),
              style: { left: `${pct}%` },
            });
          }),
        ),

        // Range input
        h('input', {
          key: 'slider',
          id,
          type: 'range',
          min: 0,
          max: isSnap ? maxIndex : resolution,
          step: isSnap ? 1 : 1,
          value: sliderPosition,
          disabled,
          onInput: handleInput,
          className:
            'relative w-full h-2 rounded-full appearance-none cursor-pointer ' +
            'bg-border accent-primary disabled:opacity-50 disabled:cursor-not-allowed',
        }),
      ],
    ),

    // Tick labels
    h(
      'div',
      { key: 'ticks', className: 'flex justify-between -mt-0.5' },
      ticks.map((tick, idx) => {
        const isActive = isSnap
          ? idx === snapIndex
          : idx === exactTickIdx;
        return h(
          'span',
          {
            key: `t-${idx}`,
            className:
              'text-[10px] leading-none text-muted-foreground cursor-pointer hover:text-foreground transition-colors' +
              (isActive ? ' font-semibold text-foreground' : ''),
            onClick: disabled ? undefined : () => onChange(tick.value),
          },
          tick.label,
        );
      }),
    ),
  ]);
}
