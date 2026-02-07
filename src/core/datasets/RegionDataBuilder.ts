import type { Feature, Polygon, MultiPolygon } from 'geojson';
import { ModdingAPI, Route, Station, Track } from "../../types";
import { arcLengthInsideBoundary, isCoordinateWithinFeature, isPolygonFeature } from "../geometry/helpers";
import { DatasetInvalidFeatureTypeError, DatasetMissingFeatureError } from "./errors";
import { RegionDataset } from "./RegionDataset";
import { ModeShare, RegionCommuterData, RegionInfraData, RouteBulletType, RouteDisplayParams } from "./types";

// Helper class to build region data layers (commute / infra data) on demand when a region is selected by the user
export class RegionDataBuilder {

  constructor(
    private api: ModdingAPI
  ) { }

  // TODO: If an API is added to show only changed demand points, this function + the region data structure should be optimized to only update the changed demand points
  buildRegionCommuteData(dataset: RegionDataset, featureId: string | number): RegionCommuterData | null {

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
    const residentModeShares = new Map<string | number, ModeShare>();
    const workerModeShares = new Map<string | number, ModeShare>();

    if (!demandData) {
      console.error("[Regions] Demand data not available");
      return null;
    }

    const currentGameData = dataset.getRegionGameData(featureId);
    if (!currentGameData || !currentGameData.demandData) {
      console.error(`[Regions] No game data or demand data found for feature ${featureId} in dataset ${dataset.id}`);
      return null;
    }

    // Build commuter data iterating over demand points located within the region
    for (const popId of currentGameData.demandData.populationIds) {
      const popData = demandData.popsMap.get(popId);
      if (!popData) {
        console.error(`[Regions] No demand data found for population ID ${popId}`);
        continue;
      }

      const isResident = currentGameData.demandData.demandPointIds.has(popData.residenceId);
      const isWorker = currentGameData.demandData.demandPointIds.has(popData.jobId);

      const popModeShare: ModeShare = popData.lastCommute.modeChoice

      let homeRegion: string | number | undefined;
      let workRegion: string | number | undefined;


      if (!isResident && !isWorker) {
        console.error(`[Regions] Population ID ${popId} in region ${featureId} of dataset ${dataset.id} is not associated with a region demand point.`);
        continue;
      }
      else if (isResident) {
        homeRegion = featureId;
        workRegion = dataset.regionDemandPointMap.get(popData.jobId);
        if (!workRegion) {
          console.error(`[Regions] Unable to find work region for population ID ${popId}`);
          continue;
        }
        residentModeShare = ModeShare.add(residentModeShare, popModeShare);
      } else {
        workRegion = featureId;
        homeRegion = dataset.regionDemandPointMap.get(popData.residenceId);
        if (!homeRegion) {
          console.error(`[Regions] Unable to find home region for population ID ${popId}`);
          continue;
        }
        workerModeShare = ModeShare.add(workerModeShare, popModeShare);
      }

      // Update mode share by region maps
      if (homeRegion) {
        const currentResidentModeShare = residentModeShares.get(homeRegion!) || { transit: 0, driving: 0, walking: 0, unknown: 0 };
        residentModeShares.set(homeRegion!, ModeShare.add(currentResidentModeShare, popModeShare));
      }
      if (workRegion) {
        const currentWorkerModeShare = workerModeShares.get(workRegion!) || { transit: 0, driving: 0, walking: 0, unknown: 0 };
        workerModeShares.set(workRegion!, ModeShare.add(currentWorkerModeShare, popModeShare));
      }
    }

    return {
      residentModeShare: residentModeShare,
      workerModeShare: workerModeShare,
      residentModeShareByRegion: residentModeShares,
      workerModeShareByRegion: workerModeShares,
    }
  }

  buildRegionInfraData(dataset: RegionDataset, featureId: string | number): RegionInfraData | null {

    const allStations: Station[] = this.api.gameState.getStations();
    const allTracks: Track[] = this.api.gameState.getTracks();
    const allRoutes: Route[] = this.api.gameState.getRoutes();

    if (!dataset.boundaryData) {
      console.error(`[Regions] No boundary data found for dataset ${dataset.id}`);
      return null
    }

    const feature = dataset.boundaryData.features.find(f => f.id === featureId);
    if (!feature) throw new DatasetMissingFeatureError(dataset.id, 'boundaryData', featureId)
    if (!isPolygonFeature(feature)) throw new DatasetInvalidFeatureTypeError(dataset.id, feature);

    const currentGameData = dataset.getRegionGameData(featureId);
    if (!currentGameData) {
      console.error(`[Regions] No game data found for feature ${featureId} in dataset ${dataset.id}`);
      return null;
    }

    const { stationNames, stationNodes } = this.getStationDataWithinRegion(feature, allStations);
    const { trackIds, trackLengths } = this.getTracksWithinRegion(feature, allTracks);
    const { routes, routeDisplayParams } = this.getRoutesWithinRegion(allRoutes, stationNodes);

    return {
      stations: stationNames,
      tracks: trackIds,
      trackLengths: trackLengths,
      routes: routes,
      routeDisplayParams: routeDisplayParams,
    };
  }

  private getStationDataWithinRegion(feature: Feature<Polygon | MultiPolygon>, stations: Station[]): {
    stationNames: Map<string, string>,
    stationNodes: Set<string>
  } {
    const stationNames = new Map<string, string>();
    const stationNodes = new Set<string>();
    for (const station of stations) {
      if (station.buildType === 'constructed') continue; // Ignore blueprint stations
      const [lng, lat] = station.coords;
      if (isCoordinateWithinFeature(lat, lng, feature)) {
        stationNames.set(station.id, station.name);
        station.stNodeIds?.forEach(nodeId => stationNodes.add(nodeId));
      }
    };
    return { stationNames, stationNodes };
  }

  private getTracksWithinRegion(feature: Feature<Polygon | MultiPolygon>, tracks: Track[]): { trackIds: Set<string>, trackLengths: Map<string, number> } {
    const trackIds = new Set<string>();
    const trackLengths = new Map<string, number>();

    for (const track of tracks) {
      if (track.buildType === 'constructed') continue; // Ignore blueprint tracks
      const trackLengthInRegion = arcLengthInsideBoundary(track.coords as Array<[number, number]>, feature);
      trackIds.add(track.id);
      trackLengths.set(track.trackType!, trackLengthInRegion);
    };

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

  private getRoutesWithinRegion(
    routes: Route[],
    stationNodes: Set<string>
  ) {
    const routesWithinRegion = new Set<string>();
    const routeDisplayParams = new Map<string, RouteDisplayParams>();

    for (const route of routes) {
      if (!route.stNodes?.some(n => stationNodes.has(n.id))) {
        continue;
      }
      routesWithinRegion.add(route.id);
      routeDisplayParams.set(route.id, this.buildRouteDisplayParams(route));
    }

    return { routes: routesWithinRegion, routeDisplayParams };
  }
}
