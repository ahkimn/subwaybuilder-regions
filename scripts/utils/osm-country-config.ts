import fs from 'fs';
import path from 'path';

import { OSM_COUNTRY_CONFIG_FILE, SOURCE_DATA_DIR } from '../../shared/consts';

export type OSMBoundaryType = {
  adminLevels: number[];
  datasetId: string;
  suffixesToTrim: string[];
  prefixesToTrim: string[];
  unitSingular: string;
  unitPlural: string;
};

export type OSMCountryConfig = {
  countryCode: string;
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
