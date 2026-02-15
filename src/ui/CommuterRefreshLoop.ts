import {
  REGIONS_INFO_UPDATE_GAME_INTERVAL,
  REGIONS_INFO_UPDATE_REAL_INTERVAL,
  UPDATE_ON_DEMAND_CHANGE,
} from '../core/constants';
import type { RegionDataManager } from '../core/datasets/RegionDataManager';
import { RegionDataType, type UIState } from '../core/types';
import type { ModdingAPI } from '../types/modding-api-v1';
import type { RegionsPanelRenderer } from './panels/types';

/*
  Helper class to manage periodic refreshing of commuter data and a set of related UI panels that require it
  
  Depending on configuration, this class will either trigger on the in-game hook for demand change or poll for changes at a regular interval.
*/
export class CommuterRefreshLoop {
  // TODO: Perhaps we can make this more generic and applicable not just to commuter data?
  private lastCheckedGameTime = -1;
  private running = false;
  private demandChangeHookAttached = false;
  private interval: number | null = null;

  constructor(
    private readonly api: ModdingAPI,
    private readonly state: Readonly<UIState>,
    private readonly dataManager: RegionDataManager,
    private readonly refreshTargets: Array<RegionsPanelRenderer>,
    private readonly updateOnDemandChange: boolean = UPDATE_ON_DEMAND_CHANGE,
  ) {
    this.maybeAttachDemandChangeHook();
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    console.log('[Regions] Starting commuter data update loop...');
    this.tryRefresh();

    if (this.updateOnDemandChange) return;

    this.interval = window.setInterval(() => {
      try {
        this.tryRefresh();
      } catch (error) {
        console.error('[Regions] Error during commuter data update:', error);
      }
    }, REGIONS_INFO_UPDATE_REAL_INTERVAL * 1000);
  }

  stop(): void {
    this.running = false;

    if (this.interval !== null) {
      console.log('[Regions] Stopping commuter data update loop...');
      clearInterval(this.interval);
      this.interval = null;
    }
    this.lastCheckedGameTime = -1;
  }

  private maybeAttachDemandChangeHook(): void {
    if (!this.updateOnDemandChange || this.demandChangeHookAttached) return;

    this.api.hooks.onDemandChange((_popCount: number) => {
      if (!this.running) return;
      this.tryRefresh();
    });
    this.demandChangeHookAttached = true;
  }

  private tryRefresh(): void {
    const visibleTargets = this.refreshTargets.filter((target) =>
      target.isVisible(),
    );
    if (visibleTargets.length === 0) {
      return;
    }

    const elapsedSeconds = this.api.gameState.getElapsedSeconds();
    if (
      elapsedSeconds - this.lastCheckedGameTime <
      REGIONS_INFO_UPDATE_GAME_INTERVAL
    ) {
      return;
    }

    void this.updateCommutersData(visibleTargets);
    this.lastCheckedGameTime = elapsedSeconds;
  }

  private async updateCommutersData(
    visibleTargets: RegionsPanelRenderer[],
  ): Promise<void> {
    const summaryDatasetIdentifiers = new Set<string>();

    if (this.state.cityCode) {
      this.dataManager
        .getCityDatasetIds(this.state.cityCode)
        .forEach((datasetIdentifier) =>
          summaryDatasetIdentifiers.add(datasetIdentifier),
        );
    }

    if (this.state.activeSelection !== null) {
      summaryDatasetIdentifiers.add(this.state.activeSelection.datasetIdentifier);
    }

    const updatePromises: Array<Promise<unknown>> = [];

    summaryDatasetIdentifiers.forEach((datasetIdentifier) => {
      updatePromises.push(
        this.dataManager.ensureExistsDataForDataset(
          datasetIdentifier,
          RegionDataType.CommuterSummary,
          { forceBuild: false },
        ),
      );
    });

    if (this.state.isActive) {
      updatePromises.push(
        this.dataManager.ensureExistsDataForSelection(
          this.state,
          RegionDataType.CommuterDetails,
          { forceBuild: false },
        ),
      );
    }

    if (updatePromises.length === 0) {
      return;
    }

    // TODO: (Issue 6) We may want to re-consider the more targeted approach of updating a specific panel only if a relevant view is present
    const results = await Promise.all(updatePromises);
    if (results.some((value) => value !== null)) {
      visibleTargets.forEach((target) => target.tryUpdatePanel());
    }
  }
}
