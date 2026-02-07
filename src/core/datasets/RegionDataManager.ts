import { ModdingAPI } from "../../types";
import { RegionDatasetRegistry } from "../registry/RegionDatasetRegistry";
import { STALE_DATA_THRESHOLD_SECONDS } from "../constants";
import { RegionDataBuilder } from "./RegionDataBuilder";
import { RegionCommuterData, RegionGameData, UIState } from "../types";

export class RegionDataManager {

  constructor(
    private builder: RegionDataBuilder,
    private registry: RegionDatasetRegistry,
    private api: ModdingAPI
  ) { }

  ensureExistsCommuterData(
    uiState: Readonly<UIState>,
    options?: {
      forceBuild?: boolean
    }
  ): RegionCommuterData | null {

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
    const commuterMetadata = gameData.commuterData?.metadata;

    if (!options?.forceBuild
      && gameData!.commuterData && gameData && !commuterMetadata?.dirty && currentTime - commuterMetadata!.lastUpdate < STALE_DATA_THRESHOLD_SECONDS
    ) {
      console.log(`[Regions] Existing commuter data is fresh, skipping rebuild. Last update was ${currentTime - commuterMetadata!.lastUpdate} seconds ago.`);
      return gameData.commuterData!;
    }

    const updatedCommuterData = this.builder.buildRegionCommuteData(dataset, uiState.activeFeatureId!, currentTime);
    if (updatedCommuterData) {
      dataset.updateWithCommuterData(uiState.activeFeatureId!, updatedCommuterData!);
    }

    console.log(`[Regions] Commuter data ${options?.forceBuild ? 'forcefully ' : ''}updated for feature ${uiState.activeFeatureId} in dataset ${uiState.activeDatasetId}:`, updatedCommuterData);
    return updatedCommuterData;
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

