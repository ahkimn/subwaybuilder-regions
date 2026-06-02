#!/usr/bin/env node
import type { ParsedArgs } from 'minimist';
import minimist from 'minimist';
import path from 'path';

import {
  renderValidationReportMarkdown,
  validateRegionInput,
  writeValidationReports,
} from './regions/validation';

function readCountryCode(argv: ParsedArgs): string | undefined {
  if (typeof argv.countryCode === 'string') {
    return argv.countryCode;
  }
  const positionalCountryCode = argv._.find(
    (value) => typeof value === 'string' && /^[A-Z]{2}$/i.test(value),
  );
  return typeof positionalCountryCode === 'string'
    ? positionalCountryCode
    : undefined;
}

function main(): void {
  const argv = minimist(process.argv.slice(2), {
    string: ['input', 'country-code', 'countryCode', 'report-dir', 'reportDir'],
    boolean: ['require-labels', 'requireLabels', 'write-report', 'writeReport'],
    alias: {
      'country-code': 'countryCode',
      'report-dir': 'reportDir',
      'require-labels': 'requireLabels',
      'write-report': 'writeReport',
    },
  });

  const inputPath = argv.input ?? argv._[0];
  if (typeof inputPath !== 'string' || inputPath.length === 0) {
    throw new Error(
      'Usage: tsx scripts/validate-region-archive.ts <archive-or-city-dir> [PE|CN] [require-labels] [--write-report] [--report-dir=<dir>]',
    );
  }

  const report = validateRegionInput({
    inputPath,
    countryCode: readCountryCode(argv),
    requireLabels:
      Boolean(argv.requireLabels) ||
      argv._.some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().replace(/^--/, '') === 'require-labels',
      ),
  });

  console.log(renderValidationReportMarkdown(report));

  if (argv.writeReport || argv.reportDir) {
    const reportDir =
      typeof argv.reportDir === 'string'
        ? argv.reportDir
        : path.join(process.cwd(), 'tmp', 'region-validation', report.cityCode);
    writeValidationReports(report, reportDir);
    console.log(`[RegionsData] Wrote validation reports to ${reportDir}`);
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main();
