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

import { getLatestReleaseVersionFromChangelog } from './utils/release-version';

type PackageJson = {
  name: string;
};

type ManifestJson = {
  version?: string;
  [key: string]: unknown;
};

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'manifest.json');
const bundlePath = path.join(rootDir, 'dist', 'index.js');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
const outputDir = path.join(rootDir, 'release');
const stagingDir = path.join(outputDir, '.staging');

function ensurePathExists(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function createZipFromStaging(stagingPath: string, zipPath: string): void {
  if (process.platform === 'win32') {
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path "${path.join(stagingPath, '*')}" -DestinationPath "${zipPath}" -Force`,
      ],
      { stdio: 'inherit' },
    );
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

function main(): void {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, 'utf8'),
  ) as PackageJson;

  const releaseVersion = getLatestReleaseVersionFromChangelog(changelogPath);
  syncManifestVersion(manifestPath, releaseVersion.bare);

  const zipName = `${packageJson.name}-${releaseVersion.withV}.zip`;
  const zipPath = path.join(outputDir, zipName);

  ensurePathExists(manifestPath);
  ensurePathExists(bundlePath);

  rmSync(stagingDir, { recursive: true, force: true });
  mkdirSync(stagingDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  copyFileSync(manifestPath, path.join(stagingDir, 'manifest.json'));
  copyFileSync(bundlePath, path.join(stagingDir, 'index.js'));

  rmSync(zipPath, { force: true });
  createZipFromStaging(stagingDir, zipPath);
  rmSync(stagingDir, { recursive: true, force: true });

  console.log(
    `[Regions] Release package generated: ${zipPath} (version ${releaseVersion.withV})`,
  );
}

main();
