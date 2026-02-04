
export type Row = Record<string, string>;

export async function fetchGeoJSON(dataPath: string): Promise<GeoJSON.FeatureCollection> {
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch GeoJSON from ${dataPath}: ${response.statusText}`);
  }
  return await response.json();
}

export function parseNumber(
  value: string
): number | undefined {
  const normalizedValue = value.replace(/,/g, '').trim();
  const parsedNumber = Number(normalizedValue);

  return Number.isFinite(parsedNumber) ? parsedNumber : undefined;
}