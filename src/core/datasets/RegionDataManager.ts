import type { ModdingAPI } from '../../types/modding-api-v1';
import {
  STALE_COMMUTER_DATA_THRESHOLD_SECONDS,
  STALE_INFRA_DATA_THRESHOLD_SECONDS,
} from '../constants';
import type { RegionDataset } from '../datasets/RegionDataset';
import type { RegionDatasetRegistry } from '../registry/RegionDatasetRegistry';
import type {
  RegionCommuterDetailsData,
  RegionCommuterSummaryData,
  RegionDataType as RegionDataTypeValue,
  RegionGameData,
  RegionGameMetadata,
  RegionInfraData,
  UIState,
} from '../types';
import { RegionDataType } from '../types';
import { yieldToEventLoop } from '../utils';
import type { RegionDataBuilder } from './RegionDataBuilder';

export class RegionDataManager {
  constructor(
    private builder: RegionDataBuilder,
    private registry: RegionDatasetRegistry,
    private api: ModdingAPI,
  ) { }

  async ensureExistsDataForSelection(
    uiState: Readonly<UIState>,
    datatype: RegionDataTypeValue,
    options?: {
      forceBuild?: boolean;
    },
  ): Promise<
    RegionCommuterSummaryData | RegionCommuterDetailsData | RegionInfraData | null
  > {
    if (!uiState.isActive) {
      console.error('[Regions] UI State not active: ', uiState);
      return null;
    }

    const dataset = this.registry.getDatasetByIdentifier(
      uiState.activeSelection!.datasetIdentifier!,
    );
    const featureId = uiState.activeSelection!.featureId!;
    const gameData = dataset.getRegionGameData(featureId);

    if (!gameData) {
      return null;
    }

    const currentTime = this.api.gameState.getElapsedSeconds();

    switch (datatype) {
      case RegionDataType.CommuterSummary: {
        const existingData = gameData.commuterSummary;
        if (
          !options?.forceBuild &&
          existingData &&
          !this.isStale(
            existingData.metadata,
            currentTime,
            STALE_COMMUTER_DATA_THRESHOLD_SECONDS,
          )
        ) {
          return existingData;
        }

        await yieldToEventLoop();
        const updatedData = await this.builder.updateDatasetCommuteData(
          dataset,
          currentTime,
        );
        if (updatedData.size > 0) {
          dataset.updateWithCommuterSummaryData(updatedData);
        }
        return dataset.getRegionGameData(featureId)?.commuterSummary ?? null;
      }
      case RegionDataType.CommuterDetails: {
        const existingData = gameData.commuterDetails;
        if (
          !options?.forceBuild &&
          existingData &&
          !this.isStale(
            existingData.metadata,
            currentTime,
            STALE_COMMUTER_DATA_THRESHOLD_SECONDS,
          )
        ) {
          return existingData;
        }

        await yieldToEventLoop();
        const updatedData = this.builder.buildRegionCommuteData(
          dataset,
          featureId,
          currentTime,
        );
        if (updatedData) {
          dataset.updateWithCommuterDetailsData(featureId, updatedData);
        }
        return updatedData;
      }
      case RegionDataType.Infra: {
        const existingData = gameData.infraData;
        if (
          !options?.forceBuild &&
          existingData &&
          !this.isStale(
            existingData.metadata,
            currentTime,
            STALE_INFRA_DATA_THRESHOLD_SECONDS,
          )
        ) {
          return existingData;
        }

        await yieldToEventLoop();
        const updatedData = await this.builder.buildRegionInfraData(
          dataset,
          featureId,
          currentTime,
        );
        if (updatedData) {
          dataset.updateWithInfraData(featureId, updatedData);
        }
        return updatedData;
      }
      default:
        console.warn(
          `[Regions] ${datatype} requests are not supported for selection-scoped ensure.`,
        );
        return null;
    }
  }

  async ensureExistsDataForDataset(
    datasetIdentifier: string,
    datatype: RegionDataTypeValue,
    options?: {
      forceBuild?: boolean;
    },
  ): Promise<
    Map<string | number, RegionCommuterSummaryData | RegionInfraData> | null
  > {
    const dataset = this.registry.getDatasetByIdentifier(datasetIdentifier);
    const currentTime = this.api.gameState.getElapsedSeconds();

    switch (datatype) {
      case RegionDataType.CommuterSummary: {
        if (
          !options?.forceBuild &&
          !this.hasStaleCommuterSummaryData(dataset, currentTime)
        ) {
          return this.collectCurrentCommuterSummaryData(dataset);
        }

        await yieldToEventLoop();
        const updatedData = await this.builder.updateDatasetCommuteData(
          dataset,
          currentTime,
        );
        if (updatedData.size > 0) {
          dataset.updateWithCommuterSummaryData(updatedData);
        }
        return updatedData;
      }
      case RegionDataType.Infra: {
        if (!options?.forceBuild && !this.hasStaleInfraData(dataset, currentTime)) {
          return this.collectCurrentInfraData(dataset);
        }

        await yieldToEventLoop();
        const updatedData = new Map<string | number, RegionInfraData>();

        for (const [featureId, gameData] of dataset.gameData.entries()) {
          if (
            !options?.forceBuild &&
            gameData.infraData &&
            !this.isStale(
              gameData.infraData.metadata,
              currentTime,
              STALE_INFRA_DATA_THRESHOLD_SECONDS,
            )
          ) {
            updatedData.set(featureId, gameData.infraData);
            continue;
          }

          const builtInfraData = await this.builder.buildRegionInfraData(
            dataset,
            featureId,
            currentTime,
          );
          if (builtInfraData) {
            dataset.updateWithInfraData(featureId, builtInfraData);
            updatedData.set(featureId, builtInfraData);
          }
        }
        return updatedData;
      }
      default:
        console.warn(
          `[Regions] ${datatype} requests are not supported for dataset-scoped ensure.`,
        );
        return null;
    }
  }

  private isStale(
    metadata: RegionGameMetadata | undefined,
    currentTime: number,
    thresholdSeconds: number,
  ): boolean {
    if (!metadata) return true;
    if (metadata.dirty) return true;
    return currentTime - metadata.lastUpdate >= thresholdSeconds;
  }

  private hasStaleCommuterSummaryData(
    dataset: RegionDataset,
    currentTime: number,
  ): boolean {
    for (const gameData of dataset.gameData.values()) {
      if (
        this.isStale(
          gameData.commuterSummary?.metadata,
          currentTime,
          STALE_COMMUTER_DATA_THRESHOLD_SECONDS,
        )
      ) {
        return true;
      }
    }
    return false;
  }

  private collectCurrentCommuterSummaryData(
    dataset: RegionDataset,
  ): Map<string | number, RegionCommuterSummaryData> {
    const currentData = new Map<string | number, RegionCommuterSummaryData>();
    dataset.gameData.forEach((gameData, featureId) => {
      if (!gameData.commuterSummary) return;
      currentData.set(featureId, gameData.commuterSummary);
    });
    return currentData;
  }

  private hasStaleInfraData(dataset: RegionDataset, currentTime: number): boolean {
    for (const gameData of dataset.gameData.values()) {
      if (
        this.isStale(
          gameData.infraData?.metadata,
          currentTime,
          STALE_INFRA_DATA_THRESHOLD_SECONDS,
        )
      ) {
        return true;
      }
    }
    return false;
  }

  private collectCurrentInfraData(
    dataset: RegionDataset,
  ): Map<string | number, RegionInfraData> {
    const currentData = new Map<string | number, RegionInfraData>();
    dataset.gameData.forEach((gameData, featureId) => {
      if (!gameData.infraData) return;
      currentData.set(featureId, gameData.infraData);
    });
    return currentData;
  }

  getGameData(uiState: Readonly<UIState>): RegionGameData | null {
    if (!uiState.isActive) {
      console.error('[Regions] UI State not active: ', uiState);
      return null;
    }
    const dataset = this.registry.getDatasetByIdentifier(
      uiState.activeSelection!.datasetIdentifier!,
    );
    return dataset.getRegionGameData(uiState.activeSelection!.featureId!);
  }

  getCityDatasetIds(cityCode: string): string[] {
    return this.registry.getCityDatasetIds(cityCode);
  }

  getDatasetDisplayName(datasetIdentifier: string): string {
    return this.registry.getDatasetDisplayNameByIdentifier(datasetIdentifier);
  }

  requestGameDataByDataset(
    datasetIdentifier: string,
  ): Map<string | number, RegionGameData> {
    const dataset = this.registry.getDatasetByIdentifier(datasetIdentifier);
    return dataset.gameData;
  }
}
