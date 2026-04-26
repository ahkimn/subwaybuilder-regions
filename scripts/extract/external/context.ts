import fs from 'fs-extra';
import type { FeatureCollection } from 'geojson';
import path from 'path';

import { isPolygonFeature } from '../../../lib/geometry/helpers';
import { SOURCE_DATA_DIR } from '../../../mods/regions/constants';
import { loadGeoJSON } from '../../utils/files';
import type {
  ExternalBoundaryFeature,
  ExternalBundleContext,
  ExternalBundleIndexRecord,
  ExternalCountryCode,
  PolygonFeatureCollection,
} from './types';

const EXTERNAL_SOURCE_DATA_ROOT_ENV = 'SUBWAYBUILDER_JP_DATA_ROOT';
const DEFAULT_EXTERNAL_SOURCE_DATA_ROOT = path.resolve(
  SOURCE_DATA_DIR,
  'jp-data',
);
const BUNDLE_INDEX_PATH = path.join('bundles', 'index.json');

export function resolveExternalSourceDataRoot(): string {
  return path.resolve(
    process.env[EXTERNAL_SOURCE_DATA_ROOT_ENV] ??
      DEFAULT_EXTERNAL_SOURCE_DATA_ROOT,
  );
}

export function assertExternalSourcePathExists(
  targetPath: string,
  label: string,
  countryCode: ExternalCountryCode,
): void {
  if (!fs.existsSync(targetPath)) {
    throw new Error(
      `[${countryCode}] Missing ${label}: ${targetPath}. Run \`npm run link:jp-data\` or set ${EXTERNAL_SOURCE_DATA_ROOT_ENV}.`,
    );
  }
}

export function toPolygonFeatureCollection(
  geoJson: GeoJSON.FeatureCollection,
): PolygonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: geoJson.features.filter(isPolygonFeature),
  };
}

export function normalizeDigitsToLength(
  value: unknown,
  length: number,
): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length === length ? digits : '';
}

export function loadExternalBundleIndex(
  sourceRoot: string,
  countryCode: ExternalCountryCode,
): ExternalBundleIndexRecord[] {
  const indexPath = path.resolve(sourceRoot, BUNDLE_INDEX_PATH);
  assertExternalSourcePathExists(indexPath, 'bundle index', countryCode);
  const payload = fs.readJsonSync(indexPath) as {
    bundles?: ExternalBundleIndexRecord[];
  };
  return Array.isArray(payload.bundles) ? payload.bundles : [];
}

export function resolveExternalBundleRecord(
  sourceRoot: string,
  bundleId: string,
  countryCode: ExternalCountryCode,
): ExternalBundleIndexRecord {
  const wantedBundle = bundleId.trim();
  const bundle = loadExternalBundleIndex(sourceRoot, countryCode).find(
    (record) => record.bundle_id === wantedBundle,
  );
  if (!bundle) {
    throw new Error(`[${countryCode}] Unknown bundle: ${wantedBundle}`);
  }

  if ((bundle.country ?? countryCode).toUpperCase() !== countryCode) {
    throw new Error(
      `[${countryCode}] Bundle ${wantedBundle} belongs to ${bundle.country ?? 'an unknown country'}, not ${countryCode}.`,
    );
  }

  return bundle;
}

function resolveBoundaryFeatureCollection(
  boundaryGeoJson: GeoJSON.FeatureCollection,
  countryCode: ExternalCountryCode,
): ExternalBoundaryFeature {
  if (boundaryGeoJson.features.length !== 1) {
    throw new Error(
      `[${countryCode}] Expected boundary.geojson to contain exactly one feature.`,
    );
  }

  const boundaryFeature = boundaryGeoJson.features[0];
  if (!isPolygonFeature(boundaryFeature)) {
    throw new Error(
      `[${countryCode}] boundary.geojson must contain a Polygon or MultiPolygon feature.`,
    );
  }

  return boundaryFeature;
}

function resolveBoundaryCodes(
  properties: GeoJSON.GeoJsonProperties,
  key: string,
  length: number,
): string[] {
  return Array.isArray(properties?.[key])
    ? properties[key]
        .map((value) => normalizeDigitsToLength(value, length))
        .filter(Boolean)
    : [];
}

export function loadExternalBundleContext(options: {
  sourceRoot: string;
  bundle: ExternalBundleIndexRecord;
  countryCode: ExternalCountryCode;
  municipalityCodeLength: number;
  prefCodeLength?: number;
  normalizeMunicipalityCode?: (value: unknown) => string;
}): ExternalBundleContext {
  const {
    sourceRoot,
    bundle,
    countryCode,
    municipalityCodeLength,
    prefCodeLength,
    normalizeMunicipalityCode,
  } = options;
  const bundleDir = path.resolve(sourceRoot, 'bundles', bundle.bundle_id);
  const boundaryPath = path.resolve(
    bundleDir,
    'phase_inputs',
    'boundary.geojson',
  );
  const boundaryFeature = resolveBoundaryFeatureCollection(
    loadGeoJSON(boundaryPath),
    countryCode,
  );
  const properties = boundaryFeature.properties ?? {};

  const municipalityCodes = Array.isArray(properties.municipality_codes)
    ? properties.municipality_codes
        .map((value) =>
          normalizeMunicipalityCode
            ? normalizeMunicipalityCode(value)
            : normalizeDigitsToLength(value, municipalityCodeLength),
        )
        .filter(Boolean)
    : [];
  if (municipalityCodes.length === 0) {
    throw new Error(
      `[${countryCode}] boundary.geojson is missing municipality_codes in ${boundaryPath}`,
    );
  }

  const prefCodes =
    prefCodeLength == null
      ? []
      : resolveBoundaryCodes(properties, 'pref_codes', prefCodeLength);
  if (prefCodeLength != null && prefCodes.length === 0) {
    throw new Error(
      `[${countryCode}] boundary.geojson is missing pref_codes in ${boundaryPath}`,
    );
  }

  return {
    bundle,
    sourceRoot,
    bundleDir,
    boundaryFeature,
    municipalityCodes: new Set(Array.from(new Set(municipalityCodes)).sort()),
    prefCodes: Array.from(new Set(prefCodes)).sort(),
  };
}

export function loadBundlePhaseInputGeoJson(
  context: Pick<ExternalBundleContext, 'bundleDir'>,
  fileName: string,
): FeatureCollection {
  return loadGeoJSON(path.resolve(context.bundleDir, 'phase_inputs', fileName));
}
