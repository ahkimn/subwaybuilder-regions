// Shared runtime detection of the SubwayBuilder game version, used to gate version-specific behaviour across mods

export type SemVer = readonly [number, number, number];

function parseVersion(value: string): SemVer | null {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

// Semver comparison of versions. Unparseable input returns false.
export function isVersionAtLeast(value: string, target: SemVer): boolean {
  const parsed = parseVersion(value);
  if (!parsed) {
    return false;
  }
  for (let index = 0; index < 3; index += 1) {
    if (parsed[index] !== target[index]) {
      return parsed[index] > target[index];
    }
  }
  return true;
}

export async function resolveGameVersionAtLeast(
  target: SemVer,
): Promise<boolean> {
  const version = await resolveGameVersion();
  return version ? isVersionAtLeast(version, target) : false;
}

// Resolve the running game version (e.g. "1.4.0"), or `null` if unavailable.
export async function resolveGameVersion(): Promise<string | null> {
  try {
    const version = await window.electron?.getVersion?.();
    return typeof version === 'string' ? version : null;
  } catch (error) {
    console.warn('[SubwayBuilder] Failed to resolve game version', error);
    return null;
  }
}
