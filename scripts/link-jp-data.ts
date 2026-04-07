import fs from 'fs';
import minimist from 'minimist';
import path from 'path';

import { SOURCE_DATA_DIR } from '../mods/regions/constants';

const projectRoot = path.resolve(__dirname, '..');
const defaultExternalRepoRoot = path.resolve(
  projectRoot,
  '..',
  'subwaybuilder-jp-data',
);
const jpMirrorRoot = path.resolve(projectRoot, SOURCE_DATA_DIR, 'jp-data');

type LinkTarget = {
  source: string;
  target: string;
  linkType: 'file' | 'junction';
};

type LinkScriptArgs = {
  dryRun: boolean;
  externalRepoRoot: string;
  forceFileSymlink: boolean;
};

function parseArgs(argvInput: string[]): LinkScriptArgs {
  const argv = minimist(argvInput, {
    string: ['repo'],
    boolean: ['dry-run', 'force-file-symlink'],
    alias: {
      repo: 'repo',
      'dry-run': 'dryRun',
      'force-file-symlink': 'forceFileSymlink',
    },
    default: {
      'dry-run': false,
      'force-file-symlink': false,
    },
  });

  return {
    dryRun: Boolean(argv.dryRun ?? argv['dry-run']),
    forceFileSymlink: Boolean(
      argv.forceFileSymlink ?? argv['force-file-symlink'],
    ),
    externalRepoRoot: path.resolve(
      String(
        argv.repo ??
          process.env.SUBWAYBUILDER_JP_DATA_REPO ??
          defaultExternalRepoRoot,
      ),
    ),
  };
}

function ensureParentDir(targetPath: string): void {
  const parentDir = path.dirname(targetPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
}

function createLink(target: LinkTarget, forceFileSymlink: boolean): void {
  try {
    fs.symlinkSync(target.source, target.target, target.linkType);
  } catch (error) {
    if (
      target.linkType === 'file' &&
      !forceFileSymlink &&
      error instanceof Error &&
      'code' in error &&
      error.code === 'EPERM'
    ) {
      fs.linkSync(target.source, target.target);
      console.log(`Created hard link: ${target.target} -> ${target.source}`);
      return;
    }

    throw error;
  }
}

function ensureSymlink(
  target: LinkTarget,
  args: Pick<LinkScriptArgs, 'dryRun' | 'forceFileSymlink'>,
): void {
  if (!fs.existsSync(target.source)) {
    console.warn(`Source path missing, skipping: ${target.source}`);
    return;
  }

  if (!fs.existsSync(target.target)) {
    if (args.dryRun) {
      console.log(
        `[dry-run] Would create ${target.linkType} link: ${target.target} -> ${target.source}`,
      );
      return;
    }

    ensureParentDir(target.target);
    createLink(target, args.forceFileSymlink);
    console.log(`Created link: ${target.target} -> ${target.source}`);
    return;
  }

  const targetStats = fs.lstatSync(target.target);
  if (!targetStats.isSymbolicLink()) {
    if (
      target.linkType === 'file' &&
      targetStats.isFile() &&
      args.forceFileSymlink
    ) {
      if (args.dryRun) {
        console.log(
          `[dry-run] Would replace existing file link with symlink: ${target.target} -> ${target.source}`,
        );
        return;
      }

      fs.unlinkSync(target.target);
      createLink(target, true);
      console.log(`Replaced existing file link with symlink: ${target.target}`);
      return;
    }

    if (target.linkType === 'file' && targetStats.isFile()) {
      console.log(`File link already present: ${target.target}`);
      return;
    }

    console.warn(
      `Target exists and is not a symlink, skipping: ${target.target}`,
    );
    return;
  }

  const currentSourcePath = path.resolve(
    path.dirname(target.target),
    fs.readlinkSync(target.target),
  );
  const expectedSourcePath = path.resolve(target.source);

  if (currentSourcePath === expectedSourcePath) {
    console.log(`Symlink already up to date: ${target.target}`);
    return;
  }

  if (args.dryRun) {
    console.log(
      `[dry-run] Would update ${target.linkType} link: ${target.target} -> ${target.source}`,
    );
    return;
  }

  fs.unlinkSync(target.target);
  createLink(target, args.forceFileSymlink);
  console.log(`Updated link: ${target.target} -> ${target.source}`);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.externalRepoRoot)) {
    console.error(`JP data repository not found: ${args.externalRepoRoot}`);
    process.exit(1);
  }

  console.log(`JP data source: ${args.externalRepoRoot}`);
  console.log(`JP mirror root: ${jpMirrorRoot}`);
  if (args.forceFileSymlink) {
    console.log(
      'File targets will be recreated as symlinks without hard-link fallback.',
    );
  }
  if (args.dryRun) {
    console.log('Running in dry-run mode. No filesystem changes will be made.');
  } else {
    fs.mkdirSync(jpMirrorRoot, { recursive: true });
  }

  const links: LinkTarget[] = [
    {
      source: path.join(args.externalRepoRoot, 'source_data', 'bundles'),
      target: path.join(jpMirrorRoot, 'bundles'),
      linkType: 'junction',
    },
    {
      source: path.join(
        args.externalRepoRoot,
        'source_data',
        'neighborhood7_boundaries',
      ),
      target: path.join(jpMirrorRoot, 'neighborhood7_boundaries'),
      linkType: 'junction',
    },
    {
      source: path.join(
        args.externalRepoRoot,
        'source_data',
        'N03-20240101.geojson.gz',
      ),
      target: path.join(jpMirrorRoot, 'N03-20240101.geojson.gz'),
      linkType: 'file',
    },
    {
      source: path.join(args.externalRepoRoot, 'scripts', 'resources'),
      target: path.join(jpMirrorRoot, 'resources'),
      linkType: 'junction',
    },
  ];

  for (const link of links) {
    ensureSymlink(link, args);
  }
}

main();
