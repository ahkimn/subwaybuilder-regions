import fs from 'fs-extra';
import path from 'path';

import { isPolygonFeature } from '../../lib/geometry/helpers';
import type { City } from '../../lib/types/cities';
import { resolveStaticTemplateCountry } from '../../mods/regions/core/registry/static';
import { DATASET_METADATA_CATALOG } from '../../mods/regions/datasets/catalog';
import { parseNumber } from '../utils/cli';
import {
  assertKnownDataset,
  getExpectedDatasetIds,
  inferCountryCodeFromDatasetIds,
} from './datasets';
import {
  listDatasetFiles,
  loadFeatureCollection,
  loadRegionInput,
  type RegionDatasetFile,
} from './io';

type CollaboratorDataIndex = {
  cityCode?: string;
  countryCode?: string;
  cityName?: string;
  datasets?: Array<{
    id?: string;
    file?: string;
    featureCount?: number;
  }>;
};

export type DatasetValidationSummary = {
  datasetId: string;
  fileName: string;
  featureCount: number;
  populationTotal: number | null;
  geometryTypes: Record<string, number>;
  missingRequiredProperties: Record<string, number>;
  missingLabels: number;
  nonPolygonFeatures: number;
  errors: string[];
  warnings: string[];
};

export type RegionArchiveValidationReport = {
  ok: boolean;
  inputPath: string;
  cityCode: string;
  countryCode: string | null;
  cityName?: string;
  datasets: DatasetValidationSummary[];
  errors: string[];
  warnings: string[];
};

export type ValidateRegionInputOptions = {
  inputPath: string;
  countryCode?: string;
  requireLabels?: boolean;
};

const REQUIRED_PROPERTIES = [
  'ID',
  'NAME',
  'DISPLAY_NAME',
  'POPULATION',
  'TOTAL_AREA',
  'AREA_WITHIN_BBOX',
] as const;

export function validateRegionInput(
  options: ValidateRegionInputOptions,
): RegionArchiveValidationReport {
  const loadedInput = loadRegionInput(options.inputPath);
  try {
    return validateCityDirectory(
      loadedInput.cityDir,
      loadedInput.cityCode,
      loadedInput.inputPath,
      options,
    );
  } finally {
    loadedInput.cleanup();
  }
}

export function validateCityDirectory(
  cityDir: string,
  fallbackCityCode: string,
  inputPath: string,
  options?: Omit<ValidateRegionInputOptions, 'inputPath'>,
): RegionArchiveValidationReport {
  const dataIndex = loadCollaboratorDataIndex(cityDir);
  const datasetFiles = listDatasetFiles(cityDir);
  const datasetIds = datasetFiles.map((entry) => entry.datasetId);
  const cityCode = (dataIndex?.cityCode ?? fallbackCityCode).toUpperCase();
  const inferredCountryCode =
    options?.countryCode?.toUpperCase() ??
    dataIndex?.countryCode?.toUpperCase() ??
    inferCountryCodeFromDatasetIds(datasetIds);
  const countryCode = inferredCountryCode ?? null;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (dataIndex?.cityCode && dataIndex.cityCode.toUpperCase() !== cityCode) {
    errors.push(
      `data_index cityCode ${dataIndex.cityCode} does not match ${cityCode}.`,
    );
  }

  if (!countryCode) {
    errors.push('Unable to infer country code from input or dataset IDs.');
  } else {
    validateRegistryCompatibility(cityCode, countryCode, errors);
    validateCanonicalFileSet(countryCode, datasetFiles, errors, warnings);
  }

  const datasetSummaries = datasetFiles.map((datasetFile) =>
    validateDatasetFile(
      datasetFile,
      dataIndex,
      Boolean(options?.requireLabels),
    ),
  );
  for (const summary of datasetSummaries) {
    errors.push(...summary.errors);
    warnings.push(...summary.warnings);
  }
  validatePopulationTotals(datasetSummaries, errors);

  return {
    ok: errors.length === 0,
    inputPath,
    cityCode,
    countryCode,
    cityName: dataIndex?.cityName,
    datasets: datasetSummaries,
    errors,
    warnings,
  };
}

export function renderValidationReportMarkdown(
  report: RegionArchiveValidationReport,
): string {
  const lines = [
    `# ${report.cityCode} Regions Validation Report`,
    '',
    `Input: ${report.inputPath}`,
    `Country: ${report.countryCode ?? 'Unknown'}`,
    `Status: ${report.ok ? 'OK' : 'FAILED'}`,
    '',
    '## Datasets',
  ];

  for (const dataset of report.datasets) {
    lines.push(
      `- ${dataset.datasetId}: ${dataset.featureCount} features, labels missing ${dataset.missingLabels}, non-polygon ${dataset.nonPolygonFeatures}`,
    );
  }

  lines.push('', '## Population Totals');
  for (const dataset of report.datasets) {
    lines.push(
      `- ${dataset.datasetId}: ${dataset.populationTotal ?? 'Unavailable'}`,
    );
  }

  lines.push('', '## Warnings');
  if (report.warnings.length === 0) {
    lines.push('- None');
  } else {
    report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  lines.push('', '## Errors');
  if (report.errors.length === 0) {
    lines.push('- None');
  } else {
    report.errors.forEach((error) => lines.push(`- ${error}`));
  }

  return `${lines.join('\n')}\n`;
}

export function writeValidationReports(
  report: RegionArchiveValidationReport,
  outputDir: string,
): void {
  fs.ensureDirSync(outputDir);
  fs.writeJsonSync(path.join(outputDir, 'validation_report.json'), report, {
    spaces: 2,
  });
  fs.writeFileSync(
    path.join(outputDir, 'validation_report.md'),
    renderValidationReportMarkdown(report),
    'utf8',
  );
}

function loadCollaboratorDataIndex(
  cityDir: string,
): CollaboratorDataIndex | null {
  const indexPath = path.join(cityDir, 'data_index.json');
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  return fs.readJsonSync(indexPath, {
    throws: false,
  }) as CollaboratorDataIndex | null;
}

function validateRegistryCompatibility(
  cityCode: string,
  countryCode: string,
  errors: string[],
): void {
  const resolvedCountry = resolveStaticTemplateCountry({
    code: cityCode,
    country: undefined,
  } as Pick<City, 'code' | 'country'>);

  if (resolvedCountry !== countryCode) {
    errors.push(
      `City ${cityCode} resolves to ${resolvedCountry ?? 'no static country'}, expected ${countryCode}.`,
    );
  }

  if (getExpectedDatasetIds(countryCode).length === 0) {
    errors.push(`Country ${countryCode} has no registered static datasets.`);
  }
}

function validateCanonicalFileSet(
  countryCode: string,
  datasetFiles: RegionDatasetFile[],
  errors: string[],
  warnings: string[],
): void {
  const expectedDatasetIds = getExpectedDatasetIds(countryCode);
  const actualDatasetIds = new Set(
    datasetFiles.map((entry) => entry.datasetId),
  );

  for (const datasetId of expectedDatasetIds) {
    assertKnownDataset(datasetId);
    if (!actualDatasetIds.has(datasetId)) {
      errors.push(`Missing canonical dataset file: ${datasetId}.geojson.gz`);
    }
  }

  for (const datasetId of actualDatasetIds) {
    if (!expectedDatasetIds.includes(datasetId)) {
      warnings.push(
        `Unexpected dataset file ${datasetId}; it is not registered for ${countryCode}.`,
      );
    }
  }
}

function validateDatasetFile(
  datasetFile: RegionDatasetFile,
  dataIndex: CollaboratorDataIndex | null,
  requireLabels: boolean,
): DatasetValidationSummary {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingRequiredProperties = Object.fromEntries(
    REQUIRED_PROPERTIES.map((propertyName) => [propertyName, 0]),
  ) as Record<string, number>;
  const geometryTypes: Record<string, number> = {};
  let missingLabels = 0;
  let nonPolygonFeatures = 0;
  let populationTotal = 0;
  let hasCompletePopulation = true;

  if (!DATASET_METADATA_CATALOG[datasetFile.datasetId]) {
    errors.push(`Unknown datasetId: ${datasetFile.datasetId}`);
  }

  let featureCollection: GeoJSON.FeatureCollection;
  try {
    featureCollection = loadFeatureCollection(datasetFile.filePath);
  } catch (error) {
    return {
      datasetId: datasetFile.datasetId,
      fileName: datasetFile.fileName,
      featureCount: 0,
      populationTotal: null,
      geometryTypes,
      missingRequiredProperties,
      missingLabels: 0,
      nonPolygonFeatures: 0,
      errors: [
        `Failed to load ${datasetFile.fileName}: ${error instanceof Error ? error.message : String(error)}`,
      ],
      warnings,
    };
  }

  if (featureCollection.type !== 'FeatureCollection') {
    errors.push(`${datasetFile.fileName} is not a FeatureCollection.`);
  }

  const features = Array.isArray(featureCollection.features)
    ? featureCollection.features
    : [];
  const expectedFeatureCount = dataIndex?.datasets?.find(
    (entry) => entry.id === datasetFile.datasetId,
  )?.featureCount;
  if (
    expectedFeatureCount !== undefined &&
    expectedFeatureCount !== features.length
  ) {
    errors.push(
      `${datasetFile.datasetId} feature count ${features.length} does not match data_index featureCount ${expectedFeatureCount}.`,
    );
  }

  for (const feature of features) {
    const geometryType = feature.geometry?.type ?? 'null';
    geometryTypes[geometryType] = (geometryTypes[geometryType] ?? 0) + 1;
    if (!isPolygonFeature(feature)) {
      nonPolygonFeatures += 1;
    }

    const properties = feature.properties ?? {};
    for (const propertyName of REQUIRED_PROPERTIES) {
      if (properties[propertyName] == null) {
        missingRequiredProperties[propertyName] += 1;
      }
    }

    if (properties.LAT == null || properties.LNG == null) {
      missingLabels += 1;
    }

    const population = parseNumber(properties.POPULATION);
    if (typeof population === 'number') {
      populationTotal += population;
    } else {
      hasCompletePopulation = false;
    }
  }

  for (const [propertyName, missingCount] of Object.entries(
    missingRequiredProperties,
  )) {
    if (missingCount > 0) {
      errors.push(
        `${datasetFile.datasetId} missing ${propertyName} on ${missingCount}/${features.length} features.`,
      );
    }
  }

  if (nonPolygonFeatures > 0) {
    errors.push(
      `${datasetFile.datasetId} has ${nonPolygonFeatures} non-polygon features.`,
    );
  }

  if (missingLabels > 0) {
    const message = `${datasetFile.datasetId} missing LAT/LNG on ${missingLabels}/${features.length} features.`;
    if (requireLabels) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  return {
    datasetId: datasetFile.datasetId,
    fileName: datasetFile.fileName,
    featureCount: features.length,
    populationTotal: hasCompletePopulation ? populationTotal : null,
    geometryTypes,
    missingRequiredProperties,
    missingLabels,
    nonPolygonFeatures,
    errors,
    warnings,
  };
}

function validatePopulationTotals(
  datasetSummaries: DatasetValidationSummary[],
  errors: string[],
): void {
  const totals = datasetSummaries
    .filter((summary) => summary.populationTotal !== null)
    .map((summary) => ({
      datasetId: summary.datasetId,
      populationTotal: summary.populationTotal!,
    }));

  if (totals.length <= 1) {
    return;
  }

  const expectedTotal = totals[0].populationTotal;
  const mismatches = totals.filter(
    (entry) => entry.populationTotal !== expectedTotal,
  );
  for (const mismatch of mismatches) {
    errors.push(
      `${mismatch.datasetId} population total ${mismatch.populationTotal} does not match ${totals[0].datasetId} total ${expectedTotal}.`,
    );
  }
}
