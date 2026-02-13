import fs from 'fs';
import path from 'path';

import { OSM_COUNTRY_CONFIG_FILE, SOURCE_DATA_DIR } from '../../shared/consts';

export type OSMBoundaryType = {
  adminLevels: number[]; // OSM admin levels to query for the administrative unit
  datasetId: string; // Unique identifier for the dataset (e.g., 'counties', 'provinces', etc.). Corresponds to the datasetId used in the CLI for OSM countries
  suffixesToTrim: string[]; // Common suffixes in boundary names to trim for cleaner labels (e.g., "County", "Province", "District")
  prefixesToTrim: string[]; // Common prefixes in boundary names to trim for cleaner labels (e.g., "City of", "Municipality of")
  unitSingular: string; // Singular form of the administrative units contained in the dataset (e.g., "County", "Province").
  unitPlural: string; // Plural form of the administrative units contained in the dataset (e.g., "Counties", "Provinces"). Used for identifying the dataset within UI elements
};

export type OSMCountryConfig = {
  countryCode: string; // ISO 3166-1 alpha-2 code
  availableBoundaryTypes: OSMBoundaryType[];
};

const OSM_COUNTRY_CONFIG_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  SOURCE_DATA_DIR,
  OSM_COUNTRY_CONFIG_FILE,
);

let cachedOsmCountryConfigs: OSMCountryConfig[] | null = null;

function assertOsmCountryConfigs(
  value: unknown,
): asserts value is OSMCountryConfig[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `[OSM Config] Expected an array in ${OSM_COUNTRY_CONFIG_PATH}`,
    );
  }

  for (let i = 0; i < value.length; i += 1) {
    const config = value[i] as Record<string, unknown>;
    if (
      typeof config !== 'object' ||
      config === null ||
      typeof config.countryCode !== 'string' ||
      !Array.isArray(config.availableBoundaryTypes)
    ) {
      throw new Error(
        `[OSM Config] Invalid country config at index ${i} in ${OSM_COUNTRY_CONFIG_PATH}`,
      );
    }
  }
}

export function loadOsmCountryConfigs(): OSMCountryConfig[] {
  if (cachedOsmCountryConfigs) {
    return cachedOsmCountryConfigs;
  }

  const fileContents = fs.readFileSync(OSM_COUNTRY_CONFIG_PATH, 'utf-8');
  let parsedConfig: unknown;

  try {
    parsedConfig = JSON.parse(fileContents);
  } catch (error) {
    throw new Error(
      `[OSM Config] Failed to parse JSON at ${OSM_COUNTRY_CONFIG_PATH}: ${String(error)}`,
    );
  }

  assertOsmCountryConfigs(parsedConfig);
  cachedOsmCountryConfigs = parsedConfig;
  return cachedOsmCountryConfigs;
}

export function getSupportedCountryCodes(): string[] {
  return loadOsmCountryConfigs().map((config) => config.countryCode);
}

export function findOsmCountryConfig(
  countryCode: string,
): OSMCountryConfig | undefined {
  return loadOsmCountryConfigs().find(
    (config) => config.countryCode === countryCode,
  );
}
