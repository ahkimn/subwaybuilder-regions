import type { MapDisplayColor } from '@lib/ui/types/DisplayColor';
import type { LayerThemeStyle } from '@subway-builder-modded/regions-schemas';

export type EffectiveFill = { base: string; hover: string };

// Resolve a dataset's effective fill colors for one theme, preferring the manifest
// override and falling back to the default palette color. When a manifest sets `fill`
// but not `fillHover`, the base color is reused for hover (only the opacity shifts).
export function resolveEffectiveFill(
  override: LayerThemeStyle | undefined,
  fallback: MapDisplayColor,
): EffectiveFill {
  return {
    base: override?.fill ?? fallback.hex,
    hover: override?.fillHover ?? override?.fill ?? fallback.hover,
  };
}
