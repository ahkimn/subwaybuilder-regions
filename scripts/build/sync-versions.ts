/**
 * sync-versions.ts
 *
 * Reads the latest version (and optionally game version) from a mod's
 * CHANGELOG.md and syncs it into the mod's manifest.json.
 *
 * When --update-readme is passed, also patches the root README.md topline
 * badges (mod version, game version, changelog link) for the given mod.
 *
 * Usage:
 *   tsx scripts/build/sync-versions.ts --mod=regions [--update-readme]
 *   tsx scripts/build/sync-versions.ts --mod=enhanced-demand-view
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import minimist from 'minimist';

import { getLatestReleaseVersionFromChangelog } from '../utils/release-version';

const rootDir = process.cwd();

type ModMeta = {
  changelogPath: string;
  manifestPath: string;
  readmeSectionId: string; // anchor used in root README for this mod's topline
};

const MOD_META: Record<string, ModMeta> = {
  regions: {
    changelogPath: path.join(rootDir, 'docs', 'regions', 'CHANGELOG.md'),
    manifestPath: path.join(rootDir, 'mods', 'regions', 'manifest.json'),
    readmeSectionId: 'regions',
  },
  'enhanced-demand-view': {
    changelogPath: path.join(
      rootDir,
      'docs',
      'enhanced-demand-view',
      'CHANGELOG.md',
    ),
    manifestPath: path.join(
      rootDir,
      'mods',
      'enhanced-demand-view',
      'manifest.json',
    ),
    readmeSectionId: 'enhanced-demand-view',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ManifestJson = { version?: string; [key: string]: unknown };

function syncManifestVersion(manifestPath: string, version: string): boolean {
  const manifest = JSON.parse(
    readFileSync(manifestPath, 'utf8'),
  ) as ManifestJson;
  if (manifest.version === version) {
    console.log(`[sync] manifest already at ${version}: ${manifestPath}`);
    return false;
  }
  manifest.version = version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`[sync] manifest updated to ${version}: ${manifestPath}`);
  return true;
}

/**
 * Extract the game version from the latest changelog entry.
 * Looks for a line like `_Game version_ v1.2.0` immediately after the header.
 */
function extractGameVersion(changelogPath: string): string | null {
  const content = readFileSync(changelogPath, 'utf8');
  // Match the game version line under the first ## heading
  const match = content.match(
    /^##\s+v\d+\.\d+\.\d+.*\n+_Game version_\s+v([\d.]+)/m,
  );
  return match ? match[1] : null;
}

/**
 * Extract the date from the latest changelog entry header.
 * Format: ## v0.4.8 - 2026-04-05
 */
function extractReleaseDate(changelogPath: string): string | null {
  const content = readFileSync(changelogPath, 'utf8');
  const match = content.match(/^##\s+v\d+\.\d+\.\d+\s+-\s+(\d{4}-\d{2}-\d{2})/m);
  return match ? match[1] : null;
}

/**
 * Update the root README.md topline section for a mod.
 *
 * Expects a block delimited by HTML comments:
 *   <!-- BEGIN {modId} status -->
 *   ...
 *   <!-- END {modId} status -->
 */
function updateReadmeTopline(
  modId: string,
  version: string,
  gameVersion: string | null,
  date: string | null,
): boolean {
  const readmePath = path.join(rootDir, 'README.md');
  const readme = readFileSync(readmePath, 'utf8');

  const beginTag = `<!-- BEGIN ${modId} status -->`;
  const endTag = `<!-- END ${modId} status -->`;

  const beginIdx = readme.indexOf(beginTag);
  const endIdx = readme.indexOf(endTag);
  if (beginIdx === -1 || endIdx === -1) {
    console.log(
      `[sync] README.md missing ${beginTag}/${endTag} markers — skipping`,
    );
    return false;
  }

  const changelogSlug = `v${version.replace(/\./g, '')}`;
  const changelogDir =
    modId === 'regions' ? 'regions' : 'enhanced-demand-view';

  const lines: string[] = [];
  lines.push(beginTag);
  lines.push('');
  lines.push(`| | |`);
  lines.push(`| --- | --- |`);
  lines.push(
    `| **Latest Version** | [\`v${version}\`](docs/${changelogDir}/CHANGELOG.md#${changelogSlug}) |`,
  );
  if (gameVersion) {
    lines.push(`| **Game Version** | \`v${gameVersion}\` |`);
  }
  if (date) {
    lines.push(`| **Released** | ${date} |`);
  }
  lines.push('');

  const before = readme.slice(0, beginIdx);
  const after = readme.slice(endIdx);
  const updated = before + lines.join('\n') + after;

  if (updated === readme) {
    console.log(`[sync] README.md ${modId} section already up to date`);
    return false;
  }

  writeFileSync(readmePath, updated, 'utf8');
  console.log(`[sync] README.md ${modId} section updated to v${version}`);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const argv = minimist(process.argv.slice(2), {
    string: ['mod'],
    boolean: ['update-readme'],
    default: { 'update-readme': false },
  });

  const modId: string | undefined = argv.mod;
  if (!modId || !MOD_META[modId]) {
    const available = Object.keys(MOD_META).join(', ');
    throw new Error(`Usage: --mod=<${available}> [--update-readme]`);
  }

  const meta = MOD_META[modId];
  const releaseVersion = getLatestReleaseVersionFromChangelog(
    meta.changelogPath,
  );
  console.log(
    `[sync] Latest changelog version for ${modId}: ${releaseVersion.withV}`,
  );

  syncManifestVersion(meta.manifestPath, releaseVersion.bare);

  if (argv['update-readme']) {
    const gameVersion = extractGameVersion(meta.changelogPath);
    const date = extractReleaseDate(meta.changelogPath);
    updateReadmeTopline(modId, releaseVersion.bare, gameVersion, date);
  }
}

main();
