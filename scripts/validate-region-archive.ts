#!/usr/bin/env node
import minimist from 'minimist';
import path from 'path';

import {
  renderValidationReportMarkdown,
  validateRegionInput,
  writeValidationReports,
} from './regions/validation';

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
      'Usage: tsx scripts/validate-region-archive.ts --input=<archive-or-city-dir> [--country-code=PE|CN] [--require-labels] [--write-report] [--report-dir=<dir>]',
    );
  }

  const report = validateRegionInput({
    inputPath,
    countryCode: argv.countryCode,
    requireLabels: Boolean(argv.requireLabels),
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
