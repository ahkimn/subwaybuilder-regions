import { REGIONS_INFO_UPDATE_GAME_INTERVAL, REGIONS_INFO_UPDATE_REAL_INTERVAL } from "../core/constants";
import { RegionDataManager } from "../core/datasets/RegionDataManager";
import type { UIState } from "../core/types";
import type { ModdingAPI } from "../types/modding-api-v1";
import { RegionsPanelRenderer } from "./panels/types";

// TODO: (Future) Make this more generic so that it is not limited to commuter data
export class CommuterRefreshLoop {
  private lastCheckedGameTime = -1;
  private interval: number | null = null;

  constructor(
    private readonly api: ModdingAPI,
    private readonly state: Readonly<UIState>,
    private readonly dataManager: RegionDataManager,
    private readonly refreshTarget: RegionsPanelRenderer
  ) { }

  start(): void {
    if (this.interval !== null) return;

    console.log("[Regions] Starting commuter data update loop...");
    this.tryRefresh();

    this.interval = window.setInterval(() => {
      try {
        this.tryRefresh();
      } catch (error) {
        console.error("[Regions] Error during commuter data update:", error);
      }
    }, REGIONS_INFO_UPDATE_REAL_INTERVAL * 1000);
  }

  stop(): void {
    if (this.interval !== null) {
      console.log("[Regions] Stopping commuter data update loop...");
      clearInterval(this.interval);
      this.interval = null;
    }
    this.lastCheckedGameTime = -1;
  }

  private tryRefresh(): void {
    if (!this.refreshTarget.isVisible()) return;

    const elapsedSeconds = this.api.gameState.getElapsedSeconds();
    if (elapsedSeconds - this.lastCheckedGameTime < REGIONS_INFO_UPDATE_GAME_INTERVAL) {
      return;
    }

    void this.updateCommutersData();
    this.lastCheckedGameTime = elapsedSeconds;
  }

  private async updateCommutersData(): Promise<void> {
    if (await this.dataManager.ensureExistsData(this.state, "commuter")) {
      this.refreshTarget.tryUpdatePanel();
    }
  }
}
