import * as turf from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

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
import { prepareBoundaryParams } from '../geometry/arc-length';
import {
  geodesicArcLengthInsideBoundary,
  planarArcLengthInsideBoundary,
} from '../geometry/arc-length';
import type { Coordinate } from '../geometry/helpers';
import {
  isCoordinateWithinFeature,
  isPolygonFeature,
} from '../geometry/helpers';
import type {
  RegionCommuterData,
  RegionInfraData,
  RouteBulletType,
  RouteDisplayParams,
} from '../types';
import { ModeShare } from '../types';
import { processInChunks } from '../utils';
import type { RegionDataset } from './RegionDataset';

// Helper class to build region data layers (commute / infra data) on demand when a region is selected by the user
export class RegionDataBuilder {
  constructor(private api: ModdingAPI) {}

  // TODO (Future): If an API is added to show only changed demand points, this function + the region data structure should be optimized to only update the changed demand points
  buildRegionCommuteData(
    dataset: RegionDataset,
    featureId: string | number,
    updateTime?: number,
  ): RegionCommuterData | null {
    const demandData = this.api.gameState.getDemandData();

    let residentModeShare: ModeShare = {
      transit: 0,
      driving: 0,
      walking: 0,
      unknown: 0,
    };
    let workerModeShare: ModeShare = {
      transit: 0,
      driving: 0,
      walking: 0,
      unknown: 0,
    };
    const residentModeShares = new Map<string, ModeShare>();
    const workerModeShares = new Map<string, ModeShare>();

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

    // Build commuter data iterating over demand points located within the region
    for (const popId of currentGameData.demandData.populationIds) {
      const popData = demandData.popsMap.get(popId);
      if (!popData) {
        console.error(
          `[Regions] No demand data found for population ID ${popId}`,
        );
        continue;
      }

      const demandPointIds = currentGameData.demandData.demandPointIds;

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

      let homeRegion: string | undefined; // Defined if the population works in this region
      let workRegion: string | undefined; // Defined if the population lives in this region

      const resolveRegion = (demandPointId: string): string | undefined => {
        return dataset.regionNameMap.get(
          dataset.regionDemandPointMap.get(demandPointId)!,
        );
      };

      // Population both lives and works in region
      if (isResident && isWorker) {
        homeRegion = workRegion = dataset.regionNameMap.get(featureId)!;

        residentModeShare = ModeShare.add(residentModeShare, popModeShare);
        workerModeShare = ModeShare.add(workerModeShare, popModeShare);
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
        residentModeShare = ModeShare.add(residentModeShare, popModeShare);
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
        workerModeShare = ModeShare.add(workerModeShare, popModeShare);
      }

      // Update mode share by region maps
      if (homeRegion) {
        workerModeShares.set(
          homeRegion,
          ModeShare.add(
            workerModeShares.get(homeRegion) ?? {
              transit: 0,
              driving: 0,
              walking: 0,
              unknown: 0,
            },
            popModeShare,
          ),
        );
      }
      if (workRegion) {
        residentModeShares.set(
          workRegion,
          ModeShare.add(
            residentModeShares.get(workRegion) ?? {
              transit: 0,
              driving: 0,
              walking: 0,
              unknown: 0,
            },
            popModeShare,
          ),
        );
      }
    }

    return {
      residentModeShare: residentModeShare,
      workerModeShare: workerModeShare,
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

    const currentGameData = dataset.getRegionGameData(featureId);
    if (!currentGameData) {
      console.error(
        `[Regions] No game data found for feature ${featureId} in dataset ${dataset.id}`,
      );
      return null;
    }

    const { stationNames, stationNodes } = this.getStationDataWithinRegion(
      feature,
      allStations,
    );
    const { trackIds, trackLengths } = await this.getTracksWithinRegionAsync(
      feature,
      allTracks,
      true,
      chunkSize,
    );
    const { routes, routeDisplayParams } = this.getRoutesWithinRegion(
      allRoutes,
      stationNodes,
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

  private getStationDataWithinRegion(
    feature: Feature<Polygon | MultiPolygon>,
    stations: Station[],
  ): {
    stationNames: Map<string, string>;
    stationNodes: Set<string>;
  } {
    const stationNames = new Map<string, string>();
    const stationNodes = new Set<string>();
    const featureBBox = turf.bbox(feature);

    for (const station of stations) {
      if (station.buildType !== 'constructed') continue; // Ignore blueprint stations
      const [lng, lat] = station.coords;
      if (isCoordinateWithinFeature(lat, lng, feature, featureBBox)) {
        stationNames.set(station.id, station.name);
        station.stNodeIds?.forEach((nodeId) => stationNodes.add(nodeId));
      }
    }
    return { stationNames, stationNodes };
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
  private async getTracksWithinRegionAsync(
    feature: Feature<Polygon | MultiPolygon>,
    tracks: Track[],
    forcePlanar: boolean,
    chunkSize: number,
  ): Promise<{
    trackIds: Map<string, number>;
    trackLengths: Map<string, number>;
  }> {
    const trackIds = new Map<string, number>();
    const trackLengths = new Map<string, number>();

    const featureBBox = turf.bbox(feature);
    let boundaryParams;

    await processInChunks(tracks, chunkSize, (track) => {
      if (track.buildType !== 'constructed') return; // Ignore blueprint tracks
      let trackLengthInRegion: number;
      const knownTrackLength = track.length; // Game track length should be geodesic

      if (forcePlanar) {
        trackLengthInRegion = planarArcLengthInsideBoundary(
          track.coords as Array<Coordinate>,
          knownTrackLength,
          (boundaryParams ??= prepareBoundaryParams(feature)),
        );
      } else {
        trackLengthInRegion = geodesicArcLengthInsideBoundary(
          track.coords as Array<Coordinate>,
          feature,
          featureBBox,
          knownTrackLength,
        );
      }

      if (trackLengthInRegion > 0) {
        trackIds.set(track.id, trackLengthInRegion);
        trackLengths.has(track.trackType!)
          ? trackLengths.set(
              track.trackType!,
              trackLengths.get(track.trackType!)! + trackLengthInRegion,
            )
          : trackLengths.set(track.trackType!, trackLengthInRegion);
      }
    });
    return { trackIds, trackLengths };
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
}
