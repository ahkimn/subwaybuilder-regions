import { z } from 'zod';

export type RegionsSettings = {
  showUnpopulatedRegions: boolean; // Whether to show regions with no demand data by default in the overview panel and layer.
};

export const RegionsSettings = {
  equals(a: RegionsSettings, b: RegionsSettings): boolean {
    return a.showUnpopulatedRegions === b.showUnpopulatedRegions;
  },
};

export function clone(settings: RegionsSettings): RegionsSettings {
  return { ...settings };
}

export function resolveSettings(
  value: unknown,
): Partial<RegionsSettings> | null {
  const SettingsPatchSchema = z.object({
    showUnpopulatedRegions: z.boolean().optional(),
  });

  const parsed = SettingsPatchSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
