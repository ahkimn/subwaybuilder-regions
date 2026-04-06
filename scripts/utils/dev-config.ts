import fs from 'fs';
import path from 'path';

import { loadYAML } from './files';

type RawConfig = {
  gamePath?: string | null;
  baseModsDir?: string | null;
  // Legacy single-mod field (backward compat)
  modDirName?: string | null;
  // Multi-mod map: modId → directory name in baseModsDir
  mods?: Record<string, string> | null;
};

export type DevConfig = {
  gamePath: string;
  baseModsDir: string;
  mods: Record<string, string>;
};

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config.yaml');

function normalizeConfig(rawConfig: RawConfig): DevConfig {
  const gamePath = rawConfig.gamePath ?? null;
  const baseModsDir = rawConfig.baseModsDir ?? null;

  // Migrate legacy modDirName to mods map
  let mods = rawConfig.mods ?? null;
  if (!mods && rawConfig.modDirName) {
    mods = { regions: rawConfig.modDirName };
  }
  if (!mods) {
    mods = { regions: 'regions' };
  }

  if (!gamePath || !baseModsDir) {
    console.error(
      'Missing required config. Set gamePath and baseModsDir in config.yaml.',
    );
    process.exit(1);
  }

  if (!fs.existsSync(gamePath)) {
    console.error(`Game path not found: ${gamePath}`);
    process.exit(1);
  }

  return { gamePath, baseModsDir, mods };
}

export function loadDevConfig(): DevConfig {
  const raw = loadYAML<RawConfig>(CONFIG_PATH);
  return normalizeConfig(raw ?? {});
}
