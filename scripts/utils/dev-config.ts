import fs from 'fs';
import path from 'path';

import { loadYAML } from './files';

type RawConfig = {
  gamePath?: string | null;
  baseModsDir?: string | null;
  modDirName?: string | null;
};

export type DevConfig = {
  gamePath: string;
  baseModsDir: string;
  modDirName: string;
};

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config.yaml');

function normalizeConfig(rawConfig: RawConfig): DevConfig {
  const gamePath = rawConfig.gamePath ?? null;
  const baseModsDir = rawConfig.baseModsDir ?? null;
  const modDirName = rawConfig.modDirName ?? 'regions'; // Default to regions

  if (!gamePath || !baseModsDir || !modDirName) {
    console.error(
      'Missing required config. Set gamePath, baseModsDir, and modDirName in config.yaml.',
    );
    process.exit(1);
  }

  if (!fs.existsSync(gamePath)) {
    console.error(`Game path not found: ${gamePath}`);
    process.exit(1);
  }

  return { gamePath, baseModsDir, modDirName };
}

export function loadDevConfig(): DevConfig {
  const raw = loadYAML<RawConfig>(CONFIG_PATH);
  return normalizeConfig(raw ?? {});
}
