import { z } from 'zod';

// #RGB, #RRGGBB, or #RRGGBBAA. Kept hex-only (opacity has its own fields) so values
// are unambiguous and safe to hand to MapLibre paint properties.
const HexColor = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
    'must be a hex color like #RRGGBB',
  );

const Opacity = z.number().min(0).max(1);

/**
 * Per-layer render overrides for one theme. Every field is optional — a map overrides
 * only the knobs it cares about; the mod's defaults fill the rest. These mirror the
 * three MapLibre layers a dataset draws (fill, outline, label).
 */
export const LayerThemeStyleSchema = z.object({
  fill: HexColor.optional(),
  fillHover: HexColor.optional(),
  fillOpacity: Opacity.optional(),
  line: HexColor.optional(),
  lineOpacity: Opacity.optional(),
  label: HexColor.optional(),
  labelHalo: HexColor.optional(),
});
export type LayerThemeStyle = z.infer<typeof LayerThemeStyleSchema>;

/**
 * Optional per-dataset style override. The mod theme is a binary light/dark swap, so a
 * creator supplies a variant per theme; either may be omitted.
 */
export const LayerStyleSchema = z.object({
  light: LayerThemeStyleSchema.optional(),
  dark: LayerThemeStyleSchema.optional(),
});
export type LayerStyle = z.infer<typeof LayerStyleSchema>;
