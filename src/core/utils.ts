
export function formatFixedNumber(
  n: number,
  decimals: number = 0,
  locale: string = "en-US"
): string {
  return n.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}


export async function fetchGeoJSON(dataPath: string): Promise<GeoJSON.FeatureCollection> {
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch GeoJSON from ${dataPath}: ${response.statusText}`);
  }
  return await response.json();
}