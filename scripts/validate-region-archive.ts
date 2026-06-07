#!/usr/bin/env node
import minimist from 'minimist';
import path from 'path';

import { readRequiredCliString } from './regions/cli';
import {
  renderValidationReportMarkdown,
  validateRegionInput,
  writeValidationReports,
} from './regions/validation';

function main(): void {
  const argv = minimist(process.argv.slice(2), {
    string: [
      'input',
      'country-code',
      'countryCode',
      'city-code',
      'cityCode',
      'report-dir',
      'reportDir',
    ],
    boolean: [
      'require-labels',
      'requireLabels',
      'allow-missing-datasets',
      'allowMissingDatasets',
      'write-report',
      'writeReport',
    ],
    alias: {
      'country-code': 'countryCode',
      'city-code': 'cityCode',
      'report-dir': 'reportDir',
      'require-labels': 'requireLabels',
      'allow-missing-datasets': 'allowMissingDatasets',
      'write-report': 'writeReport',
    },
  });

  const inputPath = argv.input ?? argv._[0];
  if (typeof inputPath !== 'string' || inputPath.length === 0) {
    throw new Error(
      'Usage: tsx scripts/validate-region-archive.ts <archive-or-city-dir> <COUNTRY> <CITY> [require-labels] [allow-missing-datasets] [--write-report] [--report-dir=<dir>]',
    );
  }

  const report = validateRegionInput({
    inputPath,
    countryCode: readRequiredCliString(argv, 'countryCode', 1),
    cityCode: readRequiredCliString(argv, 'cityCode', 2),
    requireLabels:
      Boolean(argv.requireLabels) ||
      argv._.some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().replace(/^--/, '') === 'require-labels',
      ),
    allowMissingDatasets:
      Boolean(argv.allowMissingDatasets) ||
      argv._.some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().replace(/^--/, '') === 'allow-missing-datasets',
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
