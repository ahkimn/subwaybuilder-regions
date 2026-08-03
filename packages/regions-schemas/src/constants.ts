/** Current major version of the `.railyard_map/regions/manifest.json` contract. */
export const REGIONS_MANIFEST_SCHEMA_VERSION = 1 as const;

/** Folder (relative to an installed map's root) that holds regions datasets. */
export const RAILYARD_MAP_REGIONS_DIR = '.railyard_map/regions';

/** Discovery entry point a conformant map ships inside {@link RAILYARD_MAP_REGIONS_DIR}. */
export const REGIONS_MANIFEST_FILENAME = 'manifest.json';
