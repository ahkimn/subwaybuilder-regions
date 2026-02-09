import { ModdingAPI } from "../../types";
import { RegionDatasetRegistry } from "../registry/RegionDatasetRegistry";
import { STALE_COMMUTER_DATA_THRESHOLD_SECONDS, STALE_INFRA_DATA_THRESHOLD_SECONDS } from "../constants";
import { RegionDataBuilder } from "./RegionDataBuilder";
import { RegionCommuterData, RegionGameData, RegionInfraData, UIState } from "../types";

export class RegionDataManager {

  constructor(
    private builder: RegionDataBuilder,
    private registry: RegionDatasetRegistry,
    private api: ModdingAPI
  ) { }

  private async yield(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  async ensureExistsData(
    uiState: Readonly<UIState>,
    datatype: 'commuter' | 'infra',
    options?: {
      forceBuild?: boolean
    }
  ): Promise<RegionCommuterData | RegionInfraData | null> {

    if (!uiState.isActive) {
      console.error("[Regions] UI State not active: ", uiState);
      return null;
    }

    const dataset = this.registry.getDatasetByIdentifier(uiState.activeDatasetId!);

    const gameData = dataset.getRegionGameData(uiState.activeFeatureId!);
    if (!gameData) {
      return null;
    }

    const currentTime = this.api.gameState.getElapsedSeconds();
    const existingData = datatype === 'infra' ? gameData.infraData : gameData.commuterData;
    const metadata = existingData?.metadata;
    const stalenessThreshold = datatype === 'commuter'
      ? STALE_COMMUTER_DATA_THRESHOLD_SECONDS
      : STALE_INFRA_DATA_THRESHOLD_SECONDS;

    if (!options?.forceBuild
      && existingData && gameData && !metadata?.dirty && currentTime - metadata!.lastUpdate < stalenessThreshold
    ) {
      console.log(`[Regions] Existing ${datatype === 'infra' ? 'infra' : 'commuter'} data is fresh, skipping rebuild. Last update was ${currentTime - metadata!.lastUpdate} seconds ago.`);
      return existingData;
    }

    await this.yield();

    switch (datatype) {
      case 'commuter':
        const updatedCommuterData = this.builder.buildRegionCommuteData(dataset, uiState.activeFeatureId!, currentTime);
        if (updatedCommuterData) {
          dataset.updateWithCommuterData(uiState.activeFeatureId!, updatedCommuterData!);
        }
        console.log(`[Regions] Commuter data ${options?.forceBuild ? 'forcefully ' : ''}updated for feature ${uiState.activeFeatureId} in dataset ${uiState.activeDatasetId}:`);
        return updatedCommuterData;
      case 'infra':
        const updatedInfraData = this.builder.buildRegionInfraData(dataset, uiState.activeFeatureId!, currentTime);
        if (updatedInfraData) {
          dataset.updateWithInfraData(uiState.activeFeatureId!, updatedInfraData);
        }
        console.log(`[Regions] Infra data ${options?.forceBuild ? 'forcefully ' : ''}updated for feature ${uiState.activeFeatureId} in dataset ${uiState.activeDatasetId}:`);
        return updatedInfraData;
    }
  }


  getGameData(uiState: Readonly<UIState>): RegionGameData | null {
    if (!uiState.isActive) {
      console.error("[Regions] UI State not active: ", uiState);
      return null;
    }
    const dataset = this.registry.getDatasetByIdentifier(uiState.activeDatasetId!);
    return dataset.getRegionGameData(uiState.activeFeatureId!);
  }
}

