import fs from 'fs-extra';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import path from 'path';

import { SOURCE_DATA_DIR } from '../../../shared/constants';
import { isPolygonFeature } from '../../../src/core/geometry/helpers';
import { parseNumber } from '../../utils/cli';
import { loadGeoJSON } from '../../utils/files';
import { cleanLabelName } from './names';
import type {
  GeoBoundaryFeature,
  JPBoundaryMetadata,
  JPBundleContext,
  JPBundleIndexRecord,
} from './types';

/**
 * This module contains utility functions for loading and processing the source data bundles for Japan, which are expected to be organized in the specific subwaybuilder-jp-data repository structure.
 *
 * That repository is private, and the extraction process is tightly coupled to the structure and content of that repository (including files not present remotely), so these functions cannot be executed or tested by any external user
 */

const JP_SOURCE_DATA_ROOT_ENV = 'SUBWAYBUILDER_JP_DATA_ROOT';
const DEFAULT_JP_SOURCE_DATA_ROOT = path.resolve(SOURCE_DATA_DIR, 'jp-data');
const BUNDLE_INDEX_PATH = path.join('bundles', 'index.json');
const OD_2020_MUNICIPALITY_COMPAT_MAP: Readonly<
  Record<string, readonly string[]>
> = Object.freeze({
  // Hamamatsu wards were reorganized in 2024. Several 2020-vintage source
  // files, including chocho_selected and neighborhood7 KEY_CODEs, still use
  // the legacy ward code split.
  '22138': ['22131', '22132', '22133', '22134'], // Chūō-ku
  '22139': ['22135', '22136'], // Hamana-ku
  '22140': ['22137'], // Tenryū-ku
});
const OD_2020_MUNICIPALITY_REVERSE_COMPAT_MAP: Readonly<
  Record<string, string>
> = Object.freeze(
  Object.fromEntries(
    Object.entries(OD_2020_MUNICIPALITY_COMPAT_MAP).flatMap(
      ([currentCode, legacyCodes]) =>
        legacyCodes.map((legacyCode) => [legacyCode, currentCode] as const),
    ),
  ),
);

export function resolveJPSourceDataRoot(): string {
  return path.resolve(
    process.env[JP_SOURCE_DATA_ROOT_ENV] || DEFAULT_JP_SOURCE_DATA_ROOT,
  );
}

export function assertJPSourcePathExists(
  targetPath: string,
  label: string,
): void {
  if (!fs.existsSync(targetPath)) {
    throw new Error(
      `[JP] Missing ${label}: ${targetPath}. Run \`npm run link:jp-data\` or set ${JP_SOURCE_DATA_ROOT_ENV}.`,
    );
  }
}

export function toFeatureCollection(
  geoJson: GeoJSON.FeatureCollection,
): FeatureCollection<Polygon | MultiPolygon> {
  return {
    type: 'FeatureCollection',
    features: geoJson.features.filter(isPolygonFeature),
  };
}

function normalizeDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

// ===== Name processing utilities =====

// Japanese 丁目 use nine- or eleven-digit keys that encode the prefecture (first two digits), municipality (next three digits), and specific chocho area (remaining digits)
export function normalizePrefCode(value: unknown): string {
  const digits = normalizeDigits(value);
  return /^\d{2}$/.test(digits) ? digits : '';
}

export function normalizeMunicipalityCode(value: unknown): string {
  const digits = normalizeDigits(value);
  return /^\d{5}$/.test(digits) ? digits : '';
}

export function expandOd2020MunicipalityFamily(value: unknown): string[] {
  const normalized = normalizeMunicipalityCode(value);
  if (!normalized) {
    return [];
  }

  const expanded = new Set<string>([normalized]);
  const mapped = OD_2020_MUNICIPALITY_COMPAT_MAP[normalized];
  if (mapped) {
    for (const legacyCode of mapped) {
      expanded.add(legacyCode);
    }
  }

  const currentCode = OD_2020_MUNICIPALITY_REVERSE_COMPAT_MAP[normalized];
  if (currentCode) {
    expanded.add(currentCode);
  }

  return Array.from(expanded).sort();
}

export function resolveOd2020CurrentMunicipalityCode(value: unknown): string {
  const normalized = normalizeMunicipalityCode(value);
  if (!normalized) {
    return '';
  }

  return OD_2020_MUNICIPALITY_REVERSE_COMPAT_MAP[normalized] ?? normalized;
}

export function normalizeChochoKey(value: unknown): string {
  const digits = normalizeDigits(value);
  return /^\d{9}$|^\d{11}$/.test(digits) ? digits : '';
}

export function normalizeKcode1Base(value: unknown): string {
  const baseText =
    String(value ?? '')
      .trim()
      .split('-', 1)[0] || '';
  const digits = normalizeDigits(baseText);
  return digits ? digits.padStart(4, '0').slice(-4) : '';
}

export function normalizeSAreaBase(value: unknown): string {
  const digits = normalizeDigits(value);
  if (!digits) {
    return '';
  }
  const normalized = digits.padStart(6, '0').slice(-6);
  return normalized.slice(0, 4);
}

export function normalizeBoundaryMunicipalityCode(
  municipalityValue: unknown,
): string {
  return resolveOd2020CurrentMunicipalityCode(municipalityValue);
}

function resolveNumericValue(value: unknown): number {
  const parsed = parseNumber(value);
  return parsed === undefined ? 0 : parsed;
}

// ===== Bundle loading and context building =====

export function resolveChochoPopulation(
  properties: GeoJSON.GeoJsonProperties,
): number {
  // JP region populations are defined from chocho total population only.
  // Do not substitute working-age, employed, or other labor-force fields here.
  return resolveNumericValue(properties?.pop_total);
}

function resolveBoundaryFeatureCollection(
  boundaryGeoJson: GeoJSON.FeatureCollection,
): GeoBoundaryFeature {
  if (boundaryGeoJson.features.length !== 1) {
    throw new Error(
      '[JP] Expected boundary.geojson to contain exactly one feature.',
    );
  }

  const boundaryFeature = boundaryGeoJson.features[0];
  if (!isPolygonFeature(boundaryFeature)) {
    throw new Error(
      '[JP] boundary.geojson must contain a Polygon or MultiPolygon feature.',
    );
  }

  return boundaryFeature;
}

function loadJPBundleIndex(sourceRoot: string): JPBundleIndexRecord[] {
  const indexPath = path.resolve(sourceRoot, BUNDLE_INDEX_PATH);
  assertJPSourcePathExists(indexPath, 'bundle index');
  const payload = fs.readJsonSync(indexPath) as {
    bundles?: JPBundleIndexRecord[];
  };
  return Array.isArray(payload.bundles) ? payload.bundles : [];
}

export function resolveJPBundleRecord(
  sourceRoot: string,
  bundleId: string,
): JPBundleIndexRecord {
  const wantedBundle = cleanLabelName(bundleId);

  const bundleRecord = loadJPBundleIndex(sourceRoot).find(
    (record) => record.bundle_id === wantedBundle,
  );
  if (!bundleRecord) {
    throw new Error(`[JP] Unknown bundle: ${wantedBundle}`);
  }
  return bundleRecord;
}

function loadBoundaryMetadata(bundleDir: string): JPBoundaryMetadata {
  const boundaryPath = path.resolve(
    bundleDir,
    'phase_inputs',
    'boundary.geojson',
  );
  const boundaryGeoJson = loadGeoJSON(boundaryPath);
  const boundaryFeature = resolveBoundaryFeatureCollection(boundaryGeoJson);
  const properties = boundaryFeature.properties ?? {};

  const municipalityCodes = Array.isArray(properties.municipality_codes)
    ? properties.municipality_codes
        .map((value) => normalizeMunicipalityCode(value))
        .filter(Boolean)
    : [];
  if (municipalityCodes.length === 0) {
    throw new Error(
      `[JP] boundary.geojson is missing municipality_codes in ${boundaryPath}`,
    );
  }

  const prefCodes = Array.isArray(properties.pref_codes)
    ? properties.pref_codes
        .map((value) => normalizePrefCode(value))
        .filter(Boolean)
    : [];
  if (prefCodes.length === 0) {
    throw new Error(
      `[JP] boundary.geojson is missing pref_codes in ${boundaryPath}`,
    );
  }

  return {
    boundaryFeature,
    municipalityCodes: Array.from(new Set(municipalityCodes)).sort(),
    prefCodes: Array.from(new Set(prefCodes)).sort(),
  };
}

export function buildMunicipalityPopulationMap(
  chochoSelected: FeatureCollection<Polygon | MultiPolygon>,
): Map<string, number> {
  const populationMap = new Map<string, number>();

  for (const feature of chochoSelected.features) {
    const municipalityCode = normalizeBoundaryMunicipalityCode(
      feature.properties?.municipality_code,
    );
    if (!municipalityCode) {
      throw new Error(
        '[JP] chocho_selected feature is missing a municipality code.',
      );
    }

    populationMap.set(
      municipalityCode,
      (populationMap.get(municipalityCode) || 0) +
        resolveChochoPopulation(feature.properties ?? {}),
    );
  }

  return populationMap;
}

// ===== JP Data repository extraction utilities =====

function loadChochoSelected(
  bundleDir: string,
  municipalityCodes: ReadonlySet<string>,
): FeatureCollection<Polygon | MultiPolygon> {
  const chochoPath = path.resolve(
    bundleDir,
    'phase_inputs',
    'chocho_selected.geojson',
  );
  const compatibleMunicipalityCodes = new Set<string>();
  for (const municipalityCode of municipalityCodes) {
    for (const compatibleCode of expandOd2020MunicipalityFamily(
      municipalityCode,
    )) {
      compatibleMunicipalityCodes.add(compatibleCode);
    }
  }

  const chochoGeoJson = loadGeoJSON(chochoPath);
  const chochoFeatures = toFeatureCollection(chochoGeoJson).features.flatMap(
    (feature) => {
      const rawMunicipalityCode = normalizeMunicipalityCode(
        feature.properties?.municipality_code,
      );
      if (!compatibleMunicipalityCodes.has(rawMunicipalityCode)) {
        return [];
      }

      const municipalityCode =
        resolveOd2020CurrentMunicipalityCode(rawMunicipalityCode);

      return [
        {
          ...feature,
          properties: {
            ...(feature.properties ?? {}),
            municipality_code: municipalityCode,
          },
        },
      ];
    },
  );

  return {
    type: 'FeatureCollection',
    features: chochoFeatures,
  };
}

export async function loadJPBundleContext(
  sourceRoot: string,
  bundle: JPBundleIndexRecord,
): Promise<JPBundleContext> {
  const bundleDir = path.resolve(sourceRoot, 'bundles', bundle.bundle_id);
  assertJPSourcePathExists(
    bundleDir,
    `bundle directory for ${bundle.bundle_id}`,
  );

  const boundaryMetadata = loadBoundaryMetadata(bundleDir);
  const municipalityCodes = new Set(boundaryMetadata.municipalityCodes);
  const chochoSelected = loadChochoSelected(bundleDir, municipalityCodes);

  return {
    bundle,
    sourceRoot,
    boundaryFeature: boundaryMetadata.boundaryFeature,
    municipalityCodes,
    prefCodes: boundaryMetadata.prefCodes,
    chochoSelected,
    municipalityPopulationMap: buildMunicipalityPopulationMap(chochoSelected),
  };
}
