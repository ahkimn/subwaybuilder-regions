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

function bboxIntersects(a, b) {
  return !(
    a[2] < b[0] ||
    a[0] > b[2] ||
    a[3] < b[1] ||
    a[1] > b[3]
  );
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

function intersectFeatureWithBoundaryChunks(
  feature,
  featureBBox,
  boundaryClipChunks,
) {
  const matchingChunks = boundaryClipChunks.filter((chunk) =>
    bboxIntersects(chunk.bbox, featureBBox),
  );
  if (matchingChunks.length === 0) {
    return null;
  }

  if (matchingChunks.length === 1) {
    return intersectFeatureWithBoundary(feature, matchingChunks[0].feature);
  }

  const intersections = matchingChunks.flatMap((chunk) => {
    const intersection = intersectFeatureWithBoundary(feature, chunk.feature);
    return intersection && isPolygonFeature(intersection) ? [intersection] : [];
  });
  if (intersections.length === 0) {
    return null;
  }
  if (intersections.length === 1) {
    return intersections[0];
  }

  return combinePolygonIntersections(intersections);
}

function combinePolygonIntersections(intersections) {
  const coordinates = intersections.flatMap((intersection) =>
    intersection.geometry.type === 'Polygon'
      ? [intersection.geometry.coordinates]
      : intersection.geometry.coordinates,
  );

  return coordinates.length > 0 ? turf.multiPolygon(coordinates) : null;
}

function main() {
  const { boundaryClipChunks, batch } = workerData;
  const results = batch.map(({ index, feature, featureBBox }) => {
    const clippingStart = performance.now();
    const clippedRegion = intersectFeatureWithBoundaryChunks(
      feature,
      featureBBox,
      boundaryClipChunks,
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
