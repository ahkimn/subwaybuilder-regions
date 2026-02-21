
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
  if (!isObjectRecord(value)) {
    return null;
  }

  const partial: Partial<RegionsSettings> = {};

  if ('showUnpopulatedRegions' in value) {
    if (typeof value.showUnpopulatedRegions !== 'boolean') {
      return null;
    }
    partial.showUnpopulatedRegions = value.showUnpopulatedRegions;
  }

  return partial;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
