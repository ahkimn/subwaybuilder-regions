import fs from 'fs';
import path from 'path';

import { loadDevConfig } from './utils/dev-config';

const config = loadDevConfig();
const { baseModsDir, modDirName } = config;

if (!fs.existsSync(baseModsDir)) {
  console.error(`Base mods dir does not exist: ${baseModsDir}`);
  process.exit(1);
}

const modsDir = path.join(baseModsDir, modDirName);
if (!fs.existsSync(modsDir)) {
  fs.mkdirSync(modsDir, { recursive: true });
  console.log(`Created mod directory: ${modsDir}`);
}

const projectRoot = path.resolve(__dirname, '..');
const filesToLink = [
  { name: 'index.js', source: path.join(projectRoot, 'dist', 'index.js') },
  { name: 'manifest.json', source: path.join(projectRoot, 'manifest.json') },
];

for (const file of filesToLink) {
  if (!fs.existsSync(file.source)) {
    console.warn(`Source file missing, skipping: ${file.source}`);
    continue;
  }

  const targetPath = path.join(modsDir, file.name);
  if (fs.existsSync(targetPath)) {
    console.log(`Target exists, skipping: ${targetPath}`);
    continue;
  }

  fs.symlinkSync(file.source, targetPath, 'file');
  console.log(`Created symlink: ${targetPath} -> ${file.source}`);
}
