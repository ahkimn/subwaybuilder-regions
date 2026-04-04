const { cleanCoords } = require('@turf/clean-coords');
const turf = require('@turf/turf');
const { parentPort, workerData } = require('node:worker_threads');

function isPolygonFeature(feature) {
  return (
    feature?.geometry?.type === 'Polygon' ||
    feature?.geometry?.type === 'MultiPolygon'
  );
}

function hasNonEmptyPolygonCoordinates(feature) {
  return Array.isArray(feature?.geometry?.coordinates)
    ? feature.geometry.coordinates.length > 0
    : false;
}

function intersectFeatureWithBoundary(feature, boundaryFeature) {
  const intersection = turf.intersect(
    turf.featureCollection([feature, boundaryFeature]),
  );
  if (!intersection || !isPolygonFeature(intersection)) {
    return null;
  }
  if (hasNonEmptyPolygonCoordinates(intersection)) {
    return intersection;
  }

  const cleanedIntersection = cleanCoords(intersection);
  if (
    !isPolygonFeature(cleanedIntersection) ||
    !hasNonEmptyPolygonCoordinates(cleanedIntersection)
  ) {
    return null;
  }

  return cleanedIntersection;
}

function main() {
  const { boundaryFeature, batch } = workerData;
  const results = batch.map(({ index, feature }) => {
    const clippingStart = performance.now();
    const clippedRegion = intersectFeatureWithBoundary(
      feature,
      boundaryFeature,
    );

    return {
      index,
      clippedRegion,
      clippingDurationMs: performance.now() - clippingStart,
    };
  });

  parentPort?.postMessage(results);
}

main();
