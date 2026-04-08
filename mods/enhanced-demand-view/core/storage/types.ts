import { z } from 'zod';

export type EDVSettings = {
  autoAdjustDotScaling: boolean;
  residentDotScaling: number;
  workerDotScaling: number;
};

export const EDVSettings = {
  equals(a: EDVSettings, b: EDVSettings): boolean {
    return (
      a.autoAdjustDotScaling === b.autoAdjustDotScaling &&
      a.residentDotScaling === b.residentDotScaling &&
      a.workerDotScaling === b.workerDotScaling
    );
  },
};

export function clone(settings: EDVSettings): EDVSettings {
  return { ...settings };
}

export function resolveSettings(
  value: unknown,
): Partial<EDVSettings> | null {
  const SettingsPatchSchema = z.object({
    autoAdjustDotScaling: z.boolean().optional(),
    residentDotScaling: z.number().min(0.1).max(2.0).optional(),
    workerDotScaling: z.number().min(0.1).max(2.0).optional(),
  });

  const parsed = SettingsPatchSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
