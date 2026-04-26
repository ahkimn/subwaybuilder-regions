import fs from 'fs';
import minimist from 'minimist';
import path from 'path';

import { loadDevConfig } from './utils/dev-config';

const argv = minimist(process.argv.slice(2), {
  string: ['mod'],
  default: { mod: 'all' },
});

const config = loadDevConfig();
const { baseModsDir, mods } = config;

if (!fs.existsSync(baseModsDir)) {
  console.error(`Base mods dir does not exist: ${baseModsDir}`);
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');

// Determine which mods to link
const targetMod: string = argv.mod;
const modIds = targetMod === 'all' ? Object.keys(mods) : [targetMod];

for (const modId of modIds) {
  const modDirName = mods[modId];
  if (!modDirName) {
    console.error(
      `Unknown mod "${modId}". Available mods: ${Object.keys(mods).join(', ')}`,
    );
    process.exit(1);
  }

  const modsDir = path.join(baseModsDir, modDirName);
  if (!fs.existsSync(modsDir)) {
    fs.mkdirSync(modsDir, { recursive: true });
    console.log(`Created mod directory: ${modsDir}`);
  }

  // Core files every mod needs
  const filesToLink = [
    {
      relativeTargetPath: 'index.js',
      source: path.join(projectRoot, 'dist', modId, 'index.js'),
    },
    {
      relativeTargetPath: 'manifest.json',
      source: path.join(projectRoot, 'mods', modId, 'manifest.json'),
    },
  ];

  // Regions-specific additional files
  if (modId === 'regions') {
    filesToLink.push(
      {
        relativeTargetPath: 'fetch.ps1',
        source: path.join(projectRoot, 'mods', 'regions', 'fetch.ps1'),
      },
      {
        relativeTargetPath: 'fetch.sh',
        source: path.join(projectRoot, 'mods', 'regions', 'fetch.sh'),
      },
      {
        relativeTargetPath: path.join('tools', 'fetch-cli.cjs'),
        source: path.join(projectRoot, 'dist', 'tools', 'fetch-cli.cjs'),
      },
    );
  }

  console.log(`\nLinking mod "${modId}" → ${modsDir}`);

  for (const file of filesToLink) {
    const targetPath = path.join(modsDir, file.relativeTargetPath);
    ensureFileSymlink(file.source, targetPath);
  }
}

function ensureParentDir(targetPath: string): void {
  const parentDir = path.dirname(targetPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
}

function ensureFileSymlink(sourcePath: string, targetPath: string): void {
  if (!fs.existsSync(sourcePath)) {
    console.warn(`Source file missing, skipping: ${sourcePath}`);
    return;
  }

  if (!fs.existsSync(targetPath)) {
    ensureParentDir(targetPath);
    fs.symlinkSync(sourcePath, targetPath, 'file');
    console.log(`Created symlink: ${targetPath} -> ${sourcePath}`);
    return;
  }

  const targetStats = fs.lstatSync(targetPath);
  if (!targetStats.isSymbolicLink()) {
    console.warn(`Target exists and is not a symlink, skipping: ${targetPath}`);
    return;
  }

  const currentSourcePath = path.resolve(
    path.dirname(targetPath),
    fs.readlinkSync(targetPath),
  );
  const expectedSourcePath = path.resolve(sourcePath);

  if (currentSourcePath === expectedSourcePath) {
    console.log(`Symlink already up to date: ${targetPath}`);
    return;
  }

  fs.unlinkSync(targetPath);
  fs.symlinkSync(sourcePath, targetPath, 'file');
  console.log(`Updated symlink: ${targetPath} -> ${sourcePath}`);
}
