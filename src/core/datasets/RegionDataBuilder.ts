import type { BBox, Feature, MultiPolygon, Polygon } from 'geojson';

import type {
  ModdingAPI,
  Route,
  Station,
  Track,
} from '../../types/modding-api-v1';
import { DEFAULT_CHUNK_SIZE } from '../constants';
import {
  DatasetInvalidFeatureTypeError,
  DatasetMissingFeatureError,
} from '../errors';
import type { BoundaryParams } from '../geometry/arc-length';
import {
  geodesicArcLengthInsideBoundary,
  planarArcLengthInsideBoundary,
} from '../geometry/arc-length';
import type { Coordinate } from '../geometry/helpers';
import {
  getArcBBox,
  isCoordinateWithinFeature,
  isPolygonFeature,
} from '../geometry/helpers';
import type {
  RegionCommuterDetailsData,
  RegionCommuterSummaryData,
  RegionInfraData,
  RouteBulletType,
  RouteDisplayParams,
} from '../types';
import { ModeShare } from '../types';
import { processInChunks } from '../utils';
import type { RegionDataset } from './RegionDataset';

type InfraDataFeatureContext = {
  feature: Feature<Polygon | MultiPolygon>;
  boundaryParams: BoundaryParams;
};

type InfraDataAccumulator = {
  stationNames: Map<string, string>;
  stationNodes: Set<string>;
  trackIds: Map<string, number>;
  trackLengths: Map<string, number>;
  routes: Set<string>;
  routeDisplayParams: Map<string, RouteDisplayParams>;
};

// Helper class to build region data layers (commute / infra data) on demand when a region is selected by the user
export class RegionDataBuilder {
  constructor(private api: ModdingAPI) { }

  async updateDatasetCommuteData(
    dataset: RegionDataset,
    updateTime?: number,
  ): Promise<Map<string | number, RegionCommuterSummaryData>> {
    const updatedData = new Map<string | number, RegionCommuterSummaryData>();
    const workerModeShareMap = new Map<string | number, ModeShare>();
    const residentModeShareMap = new Map<string | number, ModeShare>();
    const demandData = this.api.gameState.getDemandData();

    if (!demandData) {
      console.error('[Regions] Demand data not available');
      return updatedData;
    }

    const demandPointMap = dataset.regionDemandPointMap;

    for (const popData of demandData.popsMap.values()) {
      // These values may be empty if the region dataset does not encompass the entire playable area of the map
      const residenceRegion = demandPointMap.get(popData.residenceId);
      const jobRegion = demandPointMap.get(popData.jobId);

      const popModeShare: ModeShare = popData.lastCommute?.modeChoice ?? {
        transit: 0,
        driving: 0,
        walking: 0,
        unknown: popData.size,
      };

      if (residenceRegion !== undefined) {
        ModeShare.addInPlace(
          getOrCreateModeShare(residentModeShareMap, residenceRegion),
          popModeShare,
        );
      }

      if (jobRegion !== undefined) {
        ModeShare.addInPlace(
          getOrCreateModeShare(workerModeShareMap, jobRegion),
          popModeShare,
        );
      }
    }

    dataset.gameData.forEach((_, featureId) => {
      updatedData.set(featureId, {
        residentModeShare:
          residentModeShareMap.get(featureId) ?? ModeShare.createEmpty(),
        workerModeShare:
          workerModeShareMap.get(featureId) ?? ModeShare.createEmpty(),
        averageCommuteDistance: null, // TODO: Add average commute distance calculation
        metadata: {
          lastUpdate: updateTime ?? this.api.gameState.getElapsedSeconds(),
          dirty: false,
        },
      });
    });

    return updatedData;
  }

  // TODO (Future): If an API is added to show only changed demand points, this function + the region data structure should be optimized to only update the changed demand points
  buildRegionCommuteData(
    dataset: RegionDataset,
    featureId: string | number,
    updateTime?: number,
  ): RegionCommuterDetailsData | null {
    const demandData = this.api.gameState.getDemandData();

    const residentModeShares = new Map<string | number, ModeShare>();
    const workerModeShares = new Map<string | number, ModeShare>();

    if (!demandData) {
      console.error('[Regions] Demand data not available');
      return null;
    }

    const currentGameData = dataset.getRegionGameData(featureId);
    if (!currentGameData || !currentGameData.demandData) {
      console.error(
        `[Regions] No game data or demand data found for feature ${featureId} in dataset ${dataset.id}`,
      );
      return null;
    }

    const demandPointIds = currentGameData.demandData.demandPointIds;
    const demandPointMap = dataset.regionDemandPointMap;
    const resolveRegion = (demandPointId: string): string | number => {
      return demandPointMap.get(demandPointId)!;
    };

    // Build commuter data iterating over demand points located within the region
    for (const popId of currentGameData.demandData.populationIds) {
      const popData = demandData.popsMap.get(popId);
      if (!popData) {
        console.error(
          `[Regions] No demand data found for population ID ${popId}`,
        );
        continue;
      }

      const isResident = demandPointIds.has(popData.residenceId);
      const isWorker = demandPointIds.has(popData.jobId);

      if (!isResident && !isWorker) {
        console.error(
          `[Regions] Population ID ${popId} in region ${featureId} of dataset ${dataset.id} is not associated with a region demand point.`,
        );
        continue;
      }

      // If no lastCommute data is available for the population, the first day has likely not been completed yet.
      // We can assign all of its commuters to the unknown mode choice
      const popModeShare: ModeShare = popData.lastCommute?.modeChoice ?? {
        transit: 0,
        driving: 0,
        walking: 0,
        unknown: popData.size,
      };

      let homeRegion: string | number | undefined; // Defined if the population works in this region
      let workRegion: string | number | undefined; // Defined if the population lives in this region

      // Population both lives and works in region
      if (isResident && isWorker) {
        homeRegion = workRegion = featureId;
      }
      // Population lives in region but works outside of it
      else if (isResident) {
        workRegion = resolveRegion(popData.jobId);
        if (!workRegion) {
          console.error(
            `[Regions] Unable to find work region for population ID ${popId}`,
          );
          continue;
        }
      }
      // Population works in region but lives outside of it
      else {
        homeRegion = resolveRegion(popData.residenceId);
        if (!homeRegion) {
          console.error(
            `[Regions] Unable to find home region for population ID ${popId}`,
          );
          continue;
        }
      }

      // Update mode share by region maps
      if (homeRegion) {
        ModeShare.addInPlace(
          getOrCreateModeShare(workerModeShares, homeRegion),
          popModeShare,
        );
      }
      if (workRegion) {
        ModeShare.addInPlace(
          getOrCreateModeShare(residentModeShares, workRegion),
          popModeShare,
        );
      }
    }

    return {
      residentModeShareByRegion: residentModeShares,
      workerModeShareByRegion: workerModeShares,
      metadata: {
        lastUpdate: updateTime ?? this.api.gameState.getElapsedSeconds(),
        dirty: false,
      },
    };
  }

  async buildRegionInfraData(
    dataset: RegionDataset,
    featureId: string | number,
    updateTime?: number,
    chunkSize: number = DEFAULT_CHUNK_SIZE,
  ): Promise<RegionInfraData | null> {
    const buildStart = getCurrentMillis();
    const allStations: Station[] = this.api.gameState.getStations();
    const allTracks: Track[] = this.api.gameState.getTracks();
    const allRoutes: Route[] = this.api.gameState.getRoutes();

    if (!dataset.boundaryData) {
      console.error(
        `[Regions] No boundary data found for dataset ${dataset.id}`,
      );
      return null;
    }

    const feature = dataset.boundaryData.features.find(
      (f) => f.properties?.ID! === featureId,
    );
    if (!feature)
      throw new DatasetMissingFeatureError(
        dataset.id,
        'boundaryData',
        featureId,
      );
    if (!isPolygonFeature(feature))
      throw new DatasetInvalidFeatureTypeError(dataset.id, feature);
    const boundaryParams = dataset.regionBoundaryParamsMap.get(featureId)!;

    const currentGameData = dataset.getRegionGameData(featureId);
    if (!currentGameData) {
      console.error(
        `[Regions] No game data found for feature ${featureId} in dataset ${dataset.id}`,
      );
      return null;
    }

    const stationStart = getCurrentMillis();
    const { stationNames, stationNodes } = this.getRegionStations(
      dataset,
      featureId,
      feature,
      boundaryParams.bbox,
      allStations,
    );
    const stationDurationMs = getCurrentMillis() - stationStart;

    const trackStart = getCurrentMillis();
    const { trackIds, trackLengths } = await this.getRegionTracksAsync(
      dataset,
      featureId,
      feature,
      boundaryParams,
      allTracks,
      true,
      chunkSize,
    );
    const trackDurationMs = getCurrentMillis() - trackStart;

    const routeStart = getCurrentMillis();
    const { routes, routeDisplayParams } = this.getRoutesWithinRegion(
      allRoutes,
      stationNodes,
    );
    const routeDurationMs = getCurrentMillis() - routeStart;
    const totalDurationMs = getCurrentMillis() - buildStart;

    console.log(
      `[Regions] Infra build (region ${dataset.id}:${featureId}) timings ms | stations: ${stationDurationMs.toFixed(2)}, tracks: ${trackDurationMs.toFixed(2)}, routes: ${routeDurationMs.toFixed(2)}, total: ${totalDurationMs.toFixed(2)}`,
    );

    return {
      stations: stationNames,
      tracks: trackIds,
      trackLengths: trackLengths,
      routes: routes,
      routeDisplayParams: routeDisplayParams,
      metadata: {
        lastUpdate: updateTime ?? this.api.gameState.getElapsedSeconds(),
        dirty: false,
      },
    };
  }

  async buildDatasetInfraData(
    dataset: RegionDataset,
    updateTime?: number,
    chunkSize: number = DEFAULT_CHUNK_SIZE,
  ): Promise<Map<string | number, RegionInfraData>> {
    const buildStart = getCurrentMillis();
    const allStations: Station[] = this.api.gameState.getStations();
    const allTracks: Track[] = this.api.gameState.getTracks();
    const allRoutes: Route[] = this.api.gameState.getRoutes();

    if (!dataset.boundaryData) {
      console.error(
        `[Regions] No boundary data found for dataset ${dataset.id}`,
      );
      return new Map();
    }

    let featureContexts = new Map<string | number, InfraDataFeatureContext>();

    for (const feature of dataset.boundaryData!.features) {
      if (!isPolygonFeature(feature))
        throw new DatasetInvalidFeatureTypeError(dataset.id, feature);

      const featureId: string | number = feature.properties?.ID!;
      featureContexts.set(featureId, {
        feature,
        boundaryParams: dataset.regionBoundaryParamsMap.get(featureId)!,
      });
    }

    const accumulators = new Map<string | number, InfraDataAccumulator>();
    featureContexts.forEach((_, featureId) => {
      accumulators.set(featureId, initializeInfraAccumulator());
    });

    const stationNodeToRegionMap = new Map<string, Set<string | number>>();
    const stationStart = getCurrentMillis();
    this.getDatasetStations(
      dataset,
      featureContexts,
      accumulators,
      stationNodeToRegionMap,
      allStations,
    );
    const stationDurationMs = getCurrentMillis() - stationStart;

    const trackStart = getCurrentMillis();
    await this.getDatasetTracksAsync(
      dataset,
      featureContexts,
      accumulators,
      allTracks,
      true,
      chunkSize,
    );
    const trackDurationMs = getCurrentMillis() - trackStart;

    const routeStart = getCurrentMillis();
    this.getDatasetRoutes(accumulators, stationNodeToRegionMap, allRoutes);
    const routeDurationMs = getCurrentMillis() - routeStart;
    const totalDurationMs = getCurrentMillis() - buildStart;

    console.log(
      `[Regions] Infra build (dataset ${dataset.id}) timings ms | stations: ${stationDurationMs.toFixed(2)}, tracks: ${trackDurationMs.toFixed(2)}, routes: ${routeDurationMs.toFixed(2)}, total: ${totalDurationMs.toFixed(2)} | regions: ${featureContexts.size}`,
    );

    const finalizedData = new Map<string | number, RegionInfraData>();
    const resolvedUpdateTime =
      updateTime ?? this.api.gameState.getElapsedSeconds();
    accumulators.forEach((accumulator, featureId) => {
      finalizedData.set(
        featureId,
        this.resolveAccumulator(accumulator, resolvedUpdateTime),
      );
    });

    return finalizedData;
  }

  private getRegionStations(
    dataset: RegionDataset,
    featureId: string | number,
    feature: Feature<Polygon | MultiPolygon>,
    boundaryBBox: BBox,
    stations: Station[],
  ): {
    stationNames: Map<string, string>;
    stationNodes: Set<string>;
  } {
    const stationNames = new Map<string, string>();
    const stationNodes = new Set<string>();

    for (const station of stations) {
      if (station.buildType !== 'constructed') continue; // Ignore blueprint stations
      const [lng, lat] = station.coords;
      const candidates = dataset.queryBoundaryCandidatesByPoint(lng, lat);
      if (!candidates.has(featureId)) continue;
      if (isCoordinateWithinFeature(lat, lng, feature, boundaryBBox)) {
        stationNames.set(station.id, station.name);
        station.stNodeIds?.forEach((nodeId) => stationNodes.add(nodeId));
      }
    }
    return { stationNames, stationNodes };
  }

  private getDatasetStations(
    dataset: RegionDataset,
    featureContexts: Map<string | number, InfraDataFeatureContext>,
    accumulators: Map<string | number, InfraDataAccumulator>,
    stationNodeToRegionMap: Map<string, Set<string | number>>,
    stations: Station[],
  ): void {
    for (const station of stations) {
      if (station.buildType !== 'constructed') continue; // Ignore blueprint stations
      const [lng, lat] = station.coords;
      const candidates = dataset.queryBoundaryCandidatesByPoint(lng, lat);

      for (const featureId of candidates) {
        const context = featureContexts.get(featureId);
        if (!context) continue;

        if (
          !isCoordinateWithinFeature(
            lat,
            lng,
            context.feature,
            context.boundaryParams.bbox,
          )
        ) {
          continue;
        }

        const accumulator = accumulators.get(featureId)!;
        accumulator.stationNames.set(station.id, station.name);
        station.stNodeIds?.forEach((nodeId) => {
          accumulator.stationNodes.add(nodeId);
          const existing = stationNodeToRegionMap.get(nodeId);
          if (existing) {
            existing.add(featureId);
            return;
          }
          stationNodeToRegionMap.set(nodeId, new Set([featureId]));
        });
      }
    }
  }

  /**
   * Given a region boundary feature, and a list of all current tracks within the game, returns the following:
   * - A map of track IDs to their lengths within the region (in kilometers)
   * - A map of track types to total length of tracks of that type within the region (in kilometers)
   *
   * This function allows for both geodesic and planar approximations of track length within the region, with planar being the default due to its much lower computational cost.
   * The geodesic calculation is more accurate but takes significantly more time (up to 50x), especially for larger regions in games with many track segments.
   *
   * TODO: (Performance) Allow optional override of planar approximation for tracks if the region is small enough OR there are few track nodes OR if the user overrides through settings
   */
  private async getRegionTracksAsync(
    dataset: RegionDataset,
    featureId: string | number,
    feature: Feature<Polygon | MultiPolygon>,
    boundaryParams: BoundaryParams,
    tracks: Track[],
    forcePlanar: boolean,
    chunkSize: number,
  ): Promise<{
    trackIds: Map<string, number>;
    trackLengths: Map<string, number>;
  }> {
    const trackIds = new Map<string, number>();
    const trackLengths = new Map<string, number>();

    await processInChunks(tracks, chunkSize, (track) => {
      if (track.buildType !== 'constructed') return; // Ignore blueprint tracks
      const trackCoords = track.coords as Array<Coordinate>;
      const trackBBox = getArcBBox(trackCoords);
      if (!dataset.queryBoundaryCandidatesByBBox(trackBBox).has(featureId)) {
        return;
      }
      const trackLengthInRegion = this.computeTrackLengthInBoundary(
        trackCoords,
        track.length,
        feature,
        boundaryParams,
        forcePlanar,
      );

      if (trackLengthInRegion > 0) {
        trackIds.set(track.id, trackLengthInRegion);
        this.addTrackLength(
          trackLengths,
          track.trackType!,
          trackLengthInRegion,
        );
      }
    });
    return { trackIds, trackLengths };
  }

  private async getDatasetTracksAsync(
    dataset: RegionDataset,
    featureContexts: Map<string | number, InfraDataFeatureContext>,
    accumulators: Map<string | number, InfraDataAccumulator>,
    tracks: Track[],
    forcePlanar: boolean,
    chunkSize: number,
  ): Promise<void> {
    await processInChunks(tracks, chunkSize, (track) => {
      if (track.buildType !== 'constructed') return; // Ignore blueprint tracks
      const trackCoords = track.coords as Array<Coordinate>;
      const trackBBox = getArcBBox(trackCoords);
      const candidateIds = dataset.queryBoundaryCandidatesByBBox(trackBBox);

      for (const featureId of candidateIds) {
        const context = featureContexts.get(featureId);
        if (!context) continue;

        const trackLengthInRegion = this.computeTrackLengthInBoundary(
          trackCoords,
          track.length,
          context.feature,
          context.boundaryParams,
          forcePlanar,
        );

        if (trackLengthInRegion <= 0) continue;

        const accumulator = accumulators.get(featureId)!;
        accumulator.trackIds.set(track.id, trackLengthInRegion);
        this.addTrackLength(
          accumulator.trackLengths,
          track.trackType!,
          trackLengthInRegion,
        );
      }
    });
  }

  private getRoutesWithinRegion(routes: Route[], stationNodes: Set<string>) {
    const routesWithinRegion = new Set<string>();
    const routeDisplayParams = new Map<string, RouteDisplayParams>();

    for (const route of routes) {
      if (!route.stNodes?.some((n) => stationNodes.has(n.id))) {
        continue;
      }
      routesWithinRegion.add(route.id);
      routeDisplayParams.set(route.id, this.buildRouteDisplayParams(route));
    }

    return { routes: routesWithinRegion, routeDisplayParams };
  }

  private getDatasetRoutes(
    accumulators: Map<string | number, InfraDataAccumulator>,
    stationNodeToRegionMap: Map<string, Set<string | number>>,
    routes: Route[],
  ): void {
    for (const route of routes) {
      const regionIds = new Set<string | number>();
      route.stNodes?.forEach((node) => {
        stationNodeToRegionMap
          .get(node.id)
          ?.forEach((featureId) => regionIds.add(featureId));
      });
      if (regionIds.size === 0) continue;

      const displayParams = this.buildRouteDisplayParams(route);
      regionIds.forEach((featureId) => {
        const accumulator = accumulators.get(featureId);
        if (!accumulator) return;
        accumulator.routes.add(route.id);
        accumulator.routeDisplayParams.set(route.id, displayParams);
      });
    }
  }

  private buildRouteDisplayParams(route: Route): RouteDisplayParams {
    return {
      id: route.id,
      bullet: route.bullet!,
      color: route.color!,
      textColor: route.textColor!,
      shape: route.shape! as RouteBulletType,
    };
  }

  private resolveAccumulator(
    accumulator: InfraDataAccumulator,
    lastUpdate: number,
  ): RegionInfraData {
    return {
      stations: accumulator.stationNames,
      tracks: accumulator.trackIds,
      trackLengths: accumulator.trackLengths,
      routes: accumulator.routes,
      routeDisplayParams: accumulator.routeDisplayParams,
      metadata: {
        lastUpdate,
        dirty: false,
      },
    };
  }

  private addTrackLength(
    trackLengths: Map<string, number>,
    trackType: string,
    additionalLength: number,
  ): void {
    trackLengths.set(
      trackType,
      (trackLengths.get(trackType) ?? 0) + additionalLength,
    );
  }

  private computeTrackLengthInBoundary(
    trackCoords: Array<Coordinate>,
    knownTrackLength: number | undefined,
    feature: Feature<Polygon | MultiPolygon>,
    boundaryParams: BoundaryParams,
    forcePlanar: boolean,
  ): number {
    if (forcePlanar) {
      return planarArcLengthInsideBoundary(
        trackCoords,
        knownTrackLength,
        boundaryParams,
      );
    }

    return geodesicArcLengthInsideBoundary(
      trackCoords,
      feature,
      boundaryParams.bbox,
      knownTrackLength,
    );
  }
}

function initializeInfraAccumulator(): InfraDataAccumulator {
  return {
    stationNames: new Map<string, string>(),
    stationNodes: new Set<string>(),
    trackIds: new Map<string, number>(),
    trackLengths: new Map<string, number>(),
    routes: new Set<string>(),
    routeDisplayParams: new Map<string, RouteDisplayParams>(),
  };
}

function getCurrentMillis(): number {
  const perf = globalThis.performance;
  return perf?.now ? perf.now() : Date.now();
}

function getOrCreateModeShare<K>(map: Map<K, ModeShare>, key: K): ModeShare {
  const existing = map.get(key);
  if (existing) return existing;
  const empty = ModeShare.createEmpty();
  map.set(key, empty);
  return empty;
}
