export async function resolveLocalModsDataRoot(): Promise<string> {
  type ElectronModsAPI = {
    getModsFolder?: () => Promise<string>;
  };

  const electronApi = window.electron as ElectronModsAPI | undefined;
  if (!electronApi?.getModsFolder) {
    throw new Error('[Regions] Missing electron.getModsFolder API');
  }

  const modsDir = (await electronApi.getModsFolder()).replace(/\\/g, '/');
  // TODO: Let the user configure this path in case they wish to save the mod in a different folder (currently this is a brittle contract)
  return `${modsDir}/regions/data`;
}

export function buildLocalDatasetUrl(
  localModsDataRoot: string,
  cityCode: string,
  datasetId: string,
): string {
  return encodeURI(
    `file:///${localModsDataRoot}/${cityCode}/${datasetId}.geojson`,
  );
}

export async function localFileExists(dataPath: string): Promise<boolean> {
  try {
    const response = await fetch(dataPath);
    return response.ok;
  } catch {
    return false;
  }
}

// Helper function to read a local GeoJSON file and return its feature count whilst also validating the GeoJSON format
export async function getFeatureCountForLocalDataset(
  dataPath: string,
): Promise<number | null> {
  try {
    const response = await fetch(dataPath);
    if (!response.ok) {
      return null;
    }

    const raw = await response.text();
    let geoJson: GeoJSON.FeatureCollection;
    try {
      geoJson = JSON.parse(raw) as GeoJSON.FeatureCollection;
    } catch (error) {
      const preview = raw.slice(0, 180).replace(/\s+/g, ' ');
      console.error(
        `[Regions] Failed to parse fallback GeoJSON at ${dataPath}. Preview: ${preview}`,
        error,
      );
      return null;
    }

    if (!Array.isArray(geoJson.features)) {
      console.warn(
        `[Regions] Invalid fallback GeoJSON (missing features array) at ${dataPath}`,
      );
      return null;
    }

    return geoJson.features.length;
  } catch {
    return null;
  }
}
