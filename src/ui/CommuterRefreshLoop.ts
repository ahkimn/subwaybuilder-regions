import { REGIONS_INFO_UPDATE_GAME_INTERVAL, REGIONS_INFO_UPDATE_REAL_INTERVAL, UPDATE_ON_DEMAND_CHANGE } from "../core/constants";
import { RegionDataManager } from "../core/datasets/RegionDataManager";
import type { UIState } from "../core/types";
import type { ModdingAPI } from "../types/modding-api-v1";
import { RegionsPanelRenderer } from "./panels/types";

/*
  Helper class to manage periodic refreshing of commuter data and a set of related UI panels that require it
  
  Depending on configuration, this class will either trigger on the in-game hook for demand change or poll for changes at a regular interval.
*/
export class CommuterRefreshLoop { // TODO: Perhaps we can make this more generic and applicable not just to commuter data?
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

    console.log("[Regions] Starting commuter data update loop...");
    this.tryRefresh();

    if (this.updateOnDemandChange) return

    this.interval = window.setInterval(() => {
      try {
        this.tryRefresh();
      } catch (error) {
        console.error("[Regions] Error during commuter data update:", error);
      }
    }, REGIONS_INFO_UPDATE_REAL_INTERVAL * 1000);
  }

  stop(): void {
    this.running = false;

    if (this.interval !== null) {
      console.log("[Regions] Stopping commuter data update loop...");
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
    if (!this.refreshTargets.some(target => target.isVisible())) return;

    const elapsedSeconds = this.api.gameState.getElapsedSeconds();
    if (elapsedSeconds - this.lastCheckedGameTime < REGIONS_INFO_UPDATE_GAME_INTERVAL) {
      return;
    }

    void this.updateCommutersData();
    this.lastCheckedGameTime = elapsedSeconds;
  }

  private async updateCommutersData(): Promise<void> {
    if (await this.dataManager.ensureExistsData(this.state, "commuter")) {
      this.refreshTargets.forEach(target => target.tryUpdatePanel());
    }
  }
}
