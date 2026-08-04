import type { RegistryCacheEntry } from '@regions/dataset-index';
import type { RegionsManifest } from '@subway-builder-modded/regions-schemas';

import { buildRailyardMapRegionsPath } from '../storage/helpers';

// Map a validated .railyard_map/regions manifest to registry cache entries for one
// city. `basePath` is the installed-city dir (forward slashes) used to build the
// per-dataset file:// URLs.
export function railyardManifestToEntries(
  cityCode: string,
  basePath: string,
  manifest: RegionsManifest,
): RegistryCacheEntry[] {
  return manifest.datasets.map((dataset) => ({
    cityCode,
    datasetId: dataset.datasetId,
    country: manifest.country,
    displayName: dataset.displayName,
    unitSingular: dataset.unitSingular,
    unitPlural: dataset.unitPlural,
    source: dataset.source,
    size: dataset.size,
    dataPath: buildRailyardMapRegionsPath(basePath, dataset.file),
    isPresent: true,
    origin: 'railyard',
    fileSizeMB: dataset.fileSizeMB,
    compressed: dataset.file.endsWith('.gz'),
  }));
}

// A city that declares datasets in .railyard_map is authoritative: drop ALL
// static/dynamic entries for that city (not just per-datasetId collisions), then
// append the railyard entries.
export function gateLocalEntriesByRailyard(
  localEntries: RegistryCacheEntry[],
  railyardEntries: RegistryCacheEntry[],
): RegistryCacheEntry[] {
  const railyardCities = new Set(
    railyardEntries.map((entry) => entry.cityCode),
  );
  const gatedLocal = localEntries.filter(
    (entry) => !railyardCities.has(entry.cityCode),
  );
  return [...gatedLocal, ...railyardEntries];
}
