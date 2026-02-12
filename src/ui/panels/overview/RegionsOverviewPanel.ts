import type { RegionGameData, RegionSelection, UIState } from "../../../core/types";
import type { ModdingAPI } from "../../../types/modding-api-v1";
import type { RegionsOverviewRow, RegionsOverviewSortState, RegionsOverviewTab } from "./types";
import type React from "react";
import { createElement } from "react";
import { InputFieldProperties, renderOverviewPanelContent } from "./render";
import { RegionDataManager } from "../../../core/datasets/RegionDataManager";





export class RegionsOverviewPanel {
  private selectedDatasetId: string;

  private searchTerm = "";

  private activeTab: RegionsOverviewTab = "overview";
  private sortState: RegionsOverviewSortState = {
    sortIndex: 0,
    previousSortIndex: 1,
    sortDirection: "asc",
    previousSortDirection: "desc",
  };

  constructor(
    private readonly api: ModdingAPI,
    private readonly uiState: Readonly<UIState>,
    // For now keep as readonly; eventually, we will need to support dynamic changes to the set of loaded datasets
    private readonly regionDataManager: RegionDataManager,
    private readonly availableDatasetIds: string[],
    private readonly onRegionSelect: (selection: RegionSelection) => void,
    private readonly requestRender: () => void
  ) {
    if (availableDatasetIds.length === 0) {
      throw new Error("[Regions] Overview panel requires at least one dataset on construction.");
    }
    // Default to the first dataset
    this.selectedDatasetId = availableDatasetIds[0];
  }

  reset(): void {
    this.searchTerm = "";
    this.activeTab = "overview";
    this.sortState = {
      sortIndex: 0,
      previousSortIndex: 1,
      sortDirection: "asc",
      previousSortDirection: "desc",
    };
  }

  render(): React.ReactNode {
    const h = this.api.utils.React.createElement as typeof createElement;
    const Input = this.api.utils.components.Input as React.ComponentType<InputFieldProperties>;
    const datasetGameData = this.regionDataManager.requestGameDataByDataset(this.selectedDatasetId!);
    const activeSelection = this.uiState.activeSelection;

    const rows = this.sortRows(
      this.filterRows(this.buildRows(datasetGameData), this.searchTerm),
      this.sortState
    );

    return renderOverviewPanelContent({
      h,
      Input,
      datasetIds: this.availableDatasetIds,
      selectedDatasetId: this.selectedDatasetId!,
      activeSelection,
      activeTab: this.activeTab,
      searchTerm: this.searchTerm,
      sortState: this.sortState,
      rows,
      onSelectDataset: (datasetId: string) => {
        if (!datasetId || this.selectedDatasetId === datasetId) return;
        this.selectedDatasetId = datasetId;
        this.requestRender();
      },
      onSetTab: (tab: RegionsOverviewTab) => this.setTab(tab),
      onSearchTermChange: (value: string) => {
        this.searchTerm = value;
        this.requestRender();
      },
      onSortChange: (columnIndex: number) => this.changeSort(columnIndex),
      onSelectRow: (selection: RegionSelection) => this.onRegionSelect(selection)
    });
  }

  private buildRows(datasetGameData: Map<string | number, RegionGameData>): RegionsOverviewRow[] {


    return Array.from(datasetGameData.values()).map((gameData) => {
      return {
        selection: {
          datasetId: this.selectedDatasetId,
          featureId: gameData.featureId,
        },
        gameData
      };
    });
  }

  private filterRows(rows: RegionsOverviewRow[], searchTerm: string): RegionsOverviewRow[] {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      return rows;
    }

    return rows.filter((row) =>
      row.gameData.displayName.toLowerCase().includes(trimmed) ||
      row.gameData.fullName.toLowerCase().includes(trimmed)
    );
  }

  private sortRows(rows: RegionsOverviewRow[], sortState: RegionsOverviewSortState): RegionsOverviewRow[] {
    const applySort = (a: RegionsOverviewRow, b: RegionsOverviewRow, index: number, direction: "asc" | "desc"): number => {
      const multiplier = direction === "asc" ? 1 : -1;
      switch (index) {
        case 1:
          return (a.gameData.realPopulation ?? 0) - (b.gameData.realPopulation ?? 0) * multiplier;
        case 2:
          return (a.gameData.demandData?.residents ?? 0) - (b.gameData.demandData?.residents ?? 0) * multiplier;
        case 3:
          return (a.gameData.demandData?.workers ?? 0) - (b.gameData.demandData?.workers ?? 0) * multiplier;
        case 4:
          return (a.gameData.area ?? 0) - (b.gameData.area ?? 0) * multiplier;
        case 0:
        default:
          return a.gameData.displayName.localeCompare(b.gameData.displayName) * multiplier;
      }
    };

    return [...rows].sort((a, b) => {
      let result = applySort(a, b, sortState.sortIndex, sortState.sortDirection);
      if (result === 0) {
        result = applySort(a, b, sortState.previousSortIndex, sortState.previousSortDirection);
      }
      if (result === 0) {
        result = a.gameData.displayName.localeCompare(b.gameData.displayName);
      }
      return result;
    });
  }

  private changeSort(columnIndex: number): void {
    if (this.sortState.sortIndex === columnIndex) {
      this.sortState.sortDirection = this.sortState.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortState.previousSortIndex = this.sortState.sortIndex;
      this.sortState.previousSortDirection = this.sortState.sortDirection;
      this.sortState.sortIndex = columnIndex;
      this.sortState.sortDirection = columnIndex === 0 ? "asc" : "desc";
    }
    this.requestRender();
  }

  private setTab(tab: RegionsOverviewTab): void {
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;
    this.requestRender();
  }
}
