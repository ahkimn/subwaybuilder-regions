import type { ModdingAPI } from "../../types/modding-api-v1";
import { RegionDatasetRegistry } from "../registry/RegionDatasetRegistry";
import { STALE_COMMUTER_DATA_THRESHOLD_SECONDS, STALE_INFRA_DATA_THRESHOLD_SECONDS } from "../constants";
import { RegionDataBuilder } from "./RegionDataBuilder";
import { RegionCommuterData, RegionGameData, RegionInfraData, UIState } from "../types";
import { yieldToEventLoop } from "../utils";

export class RegionDataManager {

  constructor(
    private builder: RegionDataBuilder,
    private registry: RegionDatasetRegistry,
    private api: ModdingAPI
  ) { }


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

    const dataset = this.registry.getDatasetByIdentifier(uiState.activeSelection!.datasetId!);

    const gameData = dataset.getRegionGameData(uiState.activeSelection!.featureId!);
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

    await yieldToEventLoop();

    switch (datatype) {
      case 'commuter':
        // TODO: (Performance) If commuter data calculation becomes more complex, we may need to perform chunked processing 
        const updatedCommuterData = this.builder.buildRegionCommuteData(dataset, uiState.activeSelection!.featureId!, currentTime);
        if (updatedCommuterData) {
          dataset.updateWithCommuterData(uiState.activeSelection!.featureId!, updatedCommuterData!);
        }
        console.log(`[Regions] Commuter data ${options?.forceBuild ? 'forcefully ' : ''}updated for feature ${uiState.activeSelection!.featureId} in dataset ${uiState.activeSelection!.datasetId}:`);
        return updatedCommuterData;
      case 'infra':
        const updatedInfraData = await this.builder.buildRegionInfraData(dataset, uiState.activeSelection!.featureId!, currentTime);
        if (updatedInfraData) {
          dataset.updateWithInfraData(uiState.activeSelection!.featureId!, updatedInfraData);
        }
        console.log(`[Regions] Infra data ${options?.forceBuild ? 'forcefully ' : ''}updated for feature ${uiState.activeSelection!.featureId} in dataset ${uiState.activeSelection!.datasetId}:`);
        return updatedInfraData;
    }
  }

  getGameData(uiState: Readonly<UIState>): RegionGameData | null {
    if (!uiState.isActive) {
      console.error("[Regions] UI State not active: ", uiState);
      return null;
    }
    const dataset = this.registry.getDatasetByIdentifier(uiState.activeSelection!.datasetId!);
    return dataset.getRegionGameData(uiState.activeSelection!.featureId!);
  }

  getCityDatasetIds(cityCode: string): string[] {
    return this.registry.getCityDatasetIds(cityCode);
  }

  requestGameDataByDataset(datasetId: string): Map<string | number, RegionGameData> {
    const dataset = this.registry.getDatasetByIdentifier(datasetId);
    // TODO: Async request for all current game data for the dataset, including commuter and (potentially) infra data
    // TODO: Add callback so that the UI can be updated with the loaded data...!!!

    // Return immediately available game data map for the dataset
    return dataset.gameData;
  }
}

