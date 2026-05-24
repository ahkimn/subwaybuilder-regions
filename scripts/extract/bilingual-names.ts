export type BilingualNameParts = {
  native: string;
  en: string;
};

export function cleanName(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text || ['nan', 'none', 'null'].includes(text.toLowerCase())) {
    return '';
  }
  return text;
}

export function formatBilingualName(
  nameNative: string,
  nameEn: string,
): string {
  const native = cleanName(nameNative);
  const english = cleanName(nameEn);
  return english ? `${native}\n${english}` : native;
}

export function applyBilingualOutputNameFields(
  features: Array<GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>>,
  namesById: ReadonlyMap<string, BilingualNameParts>,
  options: {
    countryCode: string;
    nativePropertyName: string;
  },
): void {
  for (const feature of features) {
    const sourceId = String(feature.properties?.ID ?? '');
    const nameParts = namesById.get(sourceId);
    if (!nameParts) {
      throw new Error(
        `[${options.countryCode}] Missing output name parts for region ID ${sourceId}.`,
      );
    }

    feature.properties = {
      ...feature.properties,
      NAME: formatBilingualName(nameParts.native, nameParts.en),
      DISPLAY_NAME: formatBilingualName(nameParts.native, nameParts.en),
      [options.nativePropertyName]: nameParts.native,
      NAME_EN: nameParts.en,
    };
  }
}
