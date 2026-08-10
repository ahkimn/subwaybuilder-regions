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
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

// turf.intersect (polyclip-ts) can throw "Unable to complete output ring" on
// near-degenerate input. On throw, sanitize both inputs and retry once; if it
// still throws, skip this feature rather than crashing the worker (which would
// otherwise force the single-threaded fallback to re-hit the same throw).
function safeIntersect(feature, boundaryFeature) {
  try {
    return turf.intersect(turf.featureCollection([feature, boundaryFeature]));
  } catch {
    try {
      const sanitize = (f) =>
        turf.truncate(turf.rewind(cleanCoords(f)), {
          precision: 7,
          coordinates: 2,
        });
      return turf.intersect(
        turf.featureCollection([sanitize(feature), sanitize(boundaryFeature)]),
      );
    } catch (err) {
      console.warn(
        `[Regions] Skipping feature ${feature?.id ?? '<no id>'}: turf.intersect failed after sanitize (${err instanceof Error ? err.message : String(err)})`,
      );
      return null;
    }
  }
}

function intersectFeatureWithBoundary(feature, boundaryFeature) {
  const intersection = safeIntersect(feature, boundaryFeature);
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

// Persistent worker: the boundary is cloned once (workerData) and reused for every
// candidate the parent dispatches, so idle workers pull the next candidate from the
// parent's queue (dynamic load balancing) instead of pre-sharded static batches.
const { boundaryClipChunks } = workerData;

parentPort?.on('message', (message) => {
  if (message?.type === 'done') {
    process.exit(0);
  }
  if (message?.type !== 'clip') {
    return;
  }
  const { index, feature, featureBBox } = message.candidate;
  const clippingStart = performance.now();
  const clippedRegion = intersectFeatureWithBoundaryChunks(
    feature,
    featureBBox,
    boundaryClipChunks,
  );
  parentPort?.postMessage({
    type: 'result',
    index,
    clippedRegion,
    clippingDurationMs: performance.now() - clippingStart,
  });
});
