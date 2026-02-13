
function resolveFeatureId(feature: GeoJSON.Feature): string | number {
  if (feature.id !== undefined && feature.id !== null) {
    return feature.id as string | number;
  }
  return 'N/A';
}

function getPolygonCoordinateCount(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): number {
  switch (geometry.type) {
    case 'Polygon':
      return geometry.coordinates.reduce(
        (count, ring) => count + ring.length,
        0,
      );
    case 'MultiPolygon':
      return geometry.coordinates.reduce(
        (count, polygon) =>
          count + polygon.reduce((ringCount, ring) => ringCount + ring.length, 0),
        0,
      );
    default:
      return 0;
  }
}

export function renderFeaturePreview(
  features: GeoJSON.Feature[],
  previewCount: number,
): void {
  const cappedPreviewCount = Math.max(0, previewCount);
  const previewFeatures = features.slice(0, cappedPreviewCount);

  console.log(`Total queried features: ${features.length}`);
  console.log(`Previewing first ${previewFeatures.length} feature(s):`);

  previewFeatures.forEach((feature, index) => {
    const featureId = resolveFeatureId(feature);
    const geometryType = feature.geometry?.type;

    if (!geometryType) {
      console.warn(
        `[preview] Feature ${resolveFeatureId(
          feature,
        )} is missing geometry. Skipping geometry details.`,
      );
      return;
    }

    if (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon') {
      console.warn(
        `[preview] Unsupported geometry type for feature ${featureId}: ${geometryType}. Expected Polygon or MultiPolygon.`,
      );
      return;
    }

    const geometrySize = getPolygonCoordinateCount(
      feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
    );

    console.log(`[${index + 1}]`, {
      id: featureId,
      properties: feature.properties ?? {},
      geometryType: geometryType,
      geometrySize: geometrySize,
    });
  });
}
