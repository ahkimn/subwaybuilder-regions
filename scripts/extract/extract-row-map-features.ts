import osmtogeojson from 'osmtogeojson';

import type { ExtractMapFeaturesArgs } from '../utils/cli';
import { type BoundaryBox, expandBBox } from '../utils/geometry';
import type { OSMBoundaryType } from '../utils/osm-country-config';
import { renderFeaturePreview } from '../utils/preview';
import { buildOverpassQuery, fetchOverpassData } from '../utils/queries';
import type { DataConfig } from './handler-types';
import { processAndSaveBoundaries } from './process';

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function trimConfiguredName(
  name: string,
  boundaryConfig: OSMBoundaryType,
): string {
  let trimmed = normalizeWhitespace(name);
  const lowerTrimmed = () => trimmed.toLowerCase();

  for (const prefix of boundaryConfig.prefixesToTrim) {
    const normalizedPrefix = normalizeWhitespace(prefix);
    if (!normalizedPrefix) continue;

    if (lowerTrimmed().startsWith(normalizedPrefix.toLowerCase())) {
      trimmed = normalizeWhitespace(trimmed.slice(normalizedPrefix.length));
      break;
    }
  }

  for (const suffix of boundaryConfig.suffixesToTrim) {
    const normalizedSuffix = normalizeWhitespace(suffix);
    if (!normalizedSuffix) continue;

    if (lowerTrimmed().endsWith(normalizedSuffix.toLowerCase())) {
      trimmed = normalizeWhitespace(
        trimmed.slice(0, trimmed.length - normalizedSuffix.length),
      );
      break;
    }
  }

  return normalizeWhitespace(trimmed || name);
}

function preprocessTrimmedNames(
  geoJson: GeoJSON.FeatureCollection,
  boundaryConfig: OSMBoundaryType,
): GeoJSON.FeatureCollection {
  for (const feature of geoJson.features) {
    const properties = feature.properties ?? {};
    const rawName = properties.name;

    if (typeof rawName !== 'string' || rawName.trim().length === 0) {
      feature.properties = properties;
      continue;
    }

    feature.properties = {
      ...properties,
      trimmedName: trimConfiguredName(rawName, boundaryConfig),
    };
  }

  return geoJson;
}

async function extractOSMBoundaries(
  countryCode: string,
  bbox: BoundaryBox,
  boundaryConfig: OSMBoundaryType,
) {
  const query = buildOverpassQuery(
    bbox,
    boundaryConfig.adminLevels,
    countryCode,
  );
  const overpassJson = await fetchOverpassData(query);
  const geoJson = osmtogeojson(overpassJson) as GeoJSON.FeatureCollection;
  return { geoJson: preprocessTrimmedNames(geoJson, boundaryConfig) };
}

export async function extractWorldMapFeatures(
  args: ExtractMapFeaturesArgs,
  bbox: BoundaryBox,
  boundaryConfig: OSMBoundaryType,
): Promise<void> {
  const dataConfig: DataConfig = {
    datasetId: boundaryConfig.datasetId,
    displayName: boundaryConfig.unitPlural,
    unitSingular: boundaryConfig.unitSingular,
    unitPlural: boundaryConfig.unitPlural,
    source: 'OSM',
    idProperty: 'id',
    nameProperty: 'name',
    applicableNameProperties: ['trimmedName', 'name'],
    populationProperty: 'population',
  };

  const { geoJson } = await extractOSMBoundaries(
    args.countryCode,
    expandBBox(bbox, 0.01),
    boundaryConfig,
  );

  if (args.preview) {
    renderFeaturePreview(geoJson.features, args.previewCount!);
    return;
  }

  processAndSaveBoundaries(
    geoJson,
    undefined,
    bbox,
    args,
    dataConfig,
    args.countryCode,
  );
}
