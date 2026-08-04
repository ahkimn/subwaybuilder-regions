#!/usr/bin/env node
import fs from 'fs-extra';
import minimist from 'minimist';
import path from 'path';

import { loadDatasetIndex, resolveAllCityCodes } from './export-shared';
import { emitCity, type EmitCityOptions } from './regions/railyard-map-export';

type EntryArgs = EmitCityOptions & { cityCodes: string[]; all: boolean };

function parseArgs(argv: string[]): EntryArgs {
  const parsed = minimist(argv, {
    string: ['city', 'repo', 'out'],
    boolean: ['all', 'include-osm', 'validate-features', 'dry-run'],
    default: {
      all: false,
      'include-osm': false,
      'validate-features': false,
      'dry-run': false,
    },
  });

  const cityCodes = (
    Array.isArray(parsed.city) ? parsed.city : parsed.city ? [parsed.city] : []
  ).map((code: string) => String(code).toUpperCase());

  const jpDataRoot = path.resolve(
    String(
      parsed.repo ??
        process.env.SUBWAYBUILDER_JP_DATA_REPO ??
        path.resolve(__dirname, '..', '..', 'subwaybuilder-jp-data'),
    ),
  );

  return {
    cityCodes,
    all: Boolean(parsed.all),
    includeOSMData: Boolean(parsed['include-osm']),
    outDir: parsed.out
      ? path.resolve(String(parsed.out))
      : path.join(jpDataRoot, 'export'),
    validateFeatures: Boolean(parsed['validate-features']),
    dryRun: Boolean(parsed['dry-run']),
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const datasetIndex = loadDatasetIndex();
  const cityCodes = args.all ? resolveAllCityCodes() : args.cityCodes;
  if (cityCodes.length === 0) {
    console.error(
      '[RailyardMap] No city codes. Pass --city <CODE> (repeatable) or --all.',
    );
    process.exit(1);
  }

  // Ensure the output root's parent exists (jp-data's export dir), but do not create
  // the jp-data repo itself — a missing root is a misconfiguration, not our job.
  const outParent = path.dirname(args.outDir);
  if (!fs.existsSync(outParent)) {
    console.error(`[RailyardMap] Output parent does not exist: ${outParent}`);
    process.exit(1);
  }

  console.log(`[RailyardMap] Output root: ${args.outDir}`);
  const failures: Array<{ cityCode: string; reason: string }> = [];
  let successes = 0;

  for (const cityCode of cityCodes) {
    const result = emitCity(cityCode, datasetIndex, args);
    if (result.ok) {
      successes += 1;
    } else {
      failures.push({ cityCode, reason: result.reason ?? 'unknown_error' });
    }
  }

  console.log(
    `[RailyardMap] Completed. Success: ${successes}, Failed: ${failures.length}`,
  );
  if (failures.length > 0) {
    failures.forEach((failure) =>
      console.error(
        `[RailyardMap] Failed ${failure.cityCode}: ${failure.reason}`,
      ),
    );
    process.exit(1);
  }
}

main();
