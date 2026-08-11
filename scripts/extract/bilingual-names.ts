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

    const native = cleanName(nameParts.native);
    const english = cleanName(nameParts.en);

    // NAME/DISPLAY_NAME always fall back to native-only when English is absent.
    // The standalone name fields are optional in the regions-schemas contract
    // and must be omitted (not emitted as "") when empty, otherwise the
    // schema's min-length-1 rule rejects the feature.
    feature.properties = {
      ...feature.properties,
      NAME: formatBilingualName(native, english),
      DISPLAY_NAME: formatBilingualName(native, english),
      ...(native ? { [options.nativePropertyName]: native } : {}),
      // Country-agnostic canonical native name (see regions-schemas). Kept
      // alongside the legacy country-specific key for the .railyard_map contract.
      ...(native ? { NAME_NATIVE: native } : {}),
      ...(english ? { NAME_EN: english } : {}),
    };
  }
}
