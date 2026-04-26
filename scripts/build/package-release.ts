import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import minimist from 'minimist';

import { getLatestReleaseVersionFromChangelog } from '../utils/release-version';

type PackageJson = {
  name: string;
};

type ManifestJson = {
  version?: string;
  [key: string]: unknown;
};

const rootDir = process.cwd();

const MOD_CONFIGS: Record<
  string,
  {
    manifestPath: string;
    changelogPath: string;
    bundlePath: string;
    /** Extra files to include in the release zip (relative to staging dir). */
    extraFiles: { source: string; relativeTargetPath: string }[];
  }
> = {
  regions: {
    manifestPath: path.join(rootDir, 'mods', 'regions', 'manifest.json'),
    changelogPath: path.join(rootDir, 'docs', 'regions', 'CHANGELOG.md'),
    bundlePath: path.join(rootDir, 'dist', 'regions', 'index.js'),
    extraFiles: [
      {
        source: path.join(rootDir, 'mods', 'regions', 'fetch.ps1'),
        relativeTargetPath: 'fetch.ps1',
      },
      {
        source: path.join(rootDir, 'mods', 'regions', 'fetch.sh'),
        relativeTargetPath: 'fetch.sh',
      },
      {
        source: path.join(rootDir, 'dist', 'tools', 'fetch-cli.cjs'),
        relativeTargetPath: path.join('tools', 'fetch-cli.cjs'),
      },
    ],
  },
  'enhanced-demand-view': {
    manifestPath: path.join(
      rootDir,
      'mods',
      'enhanced-demand-view',
      'manifest.json',
    ),
    changelogPath: path.join(
      rootDir,
      'docs',
      'enhanced-demand-view',
      'CHANGELOG.md',
    ),
    bundlePath: path.join(rootDir, 'dist', 'enhanced-demand-view', 'index.js'),
    extraFiles: [],
  },
};

function ensurePathExists(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function createZipFromStaging(stagingPath: string, zipPath: string): void {
  if (process.platform === 'win32') {
    const escapedStagingPath = escapePowerShellStringLiteral(stagingPath);
    const escapedZipPath = escapePowerShellStringLiteral(zipPath);
    const command = [
      "$ErrorActionPreference = 'Stop'",
      'Add-Type -AssemblyName System.IO.Compression',
      'Add-Type -AssemblyName System.IO.Compression.FileSystem',
      `$source = (Resolve-Path '${escapedStagingPath}').Path`,
      `$destination = '${escapedZipPath}'`,
      'if (Test-Path $destination) { Remove-Item $destination -Force }',
      '$archive = [System.IO.Compression.ZipFile]::Open($destination, [System.IO.Compression.ZipArchiveMode]::Create)',
      'try {',
      '  $files = Get-ChildItem -Path $source -Recurse -File',
      '  foreach ($file in $files) {',
      '    $relative = $file.FullName.Substring($source.Length)',
      "    $relative = $relative -replace '^[\\\\/]+', ''",
      "    $relative = $relative -replace '\\\\', '/'",
      '    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null',
      '  }',
      '} finally {',
      '  $archive.Dispose()',
      '}',
    ].join('; ');
    execFileSync('powershell.exe', ['-NoProfile', '-Command', command], {
      stdio: 'inherit',
    });
    return;
  }

  execFileSync('zip', ['-r', '-q', zipPath, '.'], {
    cwd: stagingPath,
    stdio: 'inherit',
  });
}

function syncManifestVersion(manifestFilePath: string, version: string): void {
  const manifest = JSON.parse(
    readFileSync(manifestFilePath, 'utf8'),
  ) as ManifestJson;
  if (manifest.version === version) {
    return;
  }

  manifest.version = version;
  const updatedManifest = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(manifestFilePath, updatedManifest, 'utf8');
}

function copyAsLfLineEndings(sourcePath: string, targetPath: string): void {
  const content = readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');
  writeFileSync(targetPath, content, 'utf8');
}

function escapePowerShellStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function main(): void {
  const argv = minimist(process.argv.slice(2), {
    string: ['mod'],
  });

  const modId: string | undefined = argv.mod;
  if (!modId || !MOD_CONFIGS[modId]) {
    const available = Object.keys(MOD_CONFIGS).join(', ');
    throw new Error(
      `Usage: tsx scripts/build/package-release.ts --mod=<${available}>`,
    );
  }

  const modConfig = MOD_CONFIGS[modId];
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, 'utf8'),
  ) as PackageJson;

  const releaseVersion = getLatestReleaseVersionFromChangelog(
    modConfig.changelogPath,
  );
  syncManifestVersion(modConfig.manifestPath, releaseVersion.bare);

  const outputDir = path.join(rootDir, 'release');
  const stagingDir = path.join(outputDir, '.staging');
  const releaseManifestPath = path.join(outputDir, 'manifest.json');
  const zipName = `${packageJson.name}-${modId}-${releaseVersion.withV}.zip`;
  const zipPath = path.join(outputDir, zipName);

  ensurePathExists(modConfig.manifestPath);
  ensurePathExists(modConfig.bundlePath);
  for (const extra of modConfig.extraFiles) {
    ensurePathExists(extra.source);
  }

  rmSync(stagingDir, { recursive: true, force: true });
  mkdirSync(stagingDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  // Also export manifest as a standalone release asset.
  copyFileSync(modConfig.manifestPath, releaseManifestPath);
  copyFileSync(modConfig.manifestPath, path.join(stagingDir, 'manifest.json'));
  copyFileSync(modConfig.bundlePath, path.join(stagingDir, 'index.js'));

  for (const extra of modConfig.extraFiles) {
    const targetPath = path.join(stagingDir, extra.relativeTargetPath);
    const parentDir = path.dirname(targetPath);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }
    if (extra.source.endsWith('.sh')) {
      copyAsLfLineEndings(extra.source, targetPath);
    } else {
      copyFileSync(extra.source, targetPath);
    }
  }

  rmSync(zipPath, { force: true });
  createZipFromStaging(stagingDir, zipPath);
  rmSync(stagingDir, { recursive: true, force: true });

  console.log(
    `[${modId}] Release package generated: ${zipPath} and ${releaseManifestPath} (version ${releaseVersion.withV})`,
  );
}

main();
