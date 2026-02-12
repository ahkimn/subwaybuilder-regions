import type { RegionSelection } from "../../../core/types";
import { RegionDataset } from "../../../core/datasets/RegionDataset";
import { formatFixedNumber } from "../../../core/utils";
import type { ModdingAPI } from "../../../types/modding-api-v1";
import type { RegionsOverviewRow, RegionsOverviewSortState, RegionsOverviewTab } from "./types";
import type React from "react";
import { createElement } from "react";
import { GameInputProps, renderOverviewPanelContent } from "./render";

type RegionsOverviewPanelOptions = {
  api: ModdingAPI;
  getCurrentCityCode: () => string | null;
  getCityDatasets: (cityCode: string) => RegionDataset[];
  getActiveSelection: () => RegionSelection | null;
  onSelectRegion: (selection: RegionSelection, source: "overview-click") => void;
  requestRender: () => void;
};

export class RegionsOverviewPanel {
  private readonly api: ModdingAPI;
  private readonly getCurrentCityCode: () => string | null;
  private readonly getCityDatasets: (cityCode: string) => RegionDataset[];
  private readonly getActiveSelection: () => RegionSelection | null;
  private readonly onSelectRegion: (selection: RegionSelection, source: "overview-click") => void;
  private readonly requestRender: () => void;

  private selectedDatasetId: string | null = null;
  private searchTerm = "";
  private activeTab: RegionsOverviewTab = "overview";
  private sortState: RegionsOverviewSortState = {
    sortIndex: 0,
    previousSortIndex: 1,
    sortDirection: "asc",
    previousSortDirection: "desc",
  };

  constructor(options: RegionsOverviewPanelOptions) {
    this.api = options.api;
    this.getCurrentCityCode = options.getCurrentCityCode;
    this.getCityDatasets = options.getCityDatasets;
    this.getActiveSelection = options.getActiveSelection;
    this.onSelectRegion = options.onSelectRegion;
    this.requestRender = options.requestRender;
  }

  reset(): void {
    this.selectedDatasetId = null;
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
    const Input = this.api.utils.components.Input as React.ComponentType<GameInputProps>;

    const cityCode = this.getCurrentCityCode();
    const datasets = cityCode ? this.getCityDatasets(cityCode) : [];
    const selected = this.resolveSelectedDataset(datasets);
    const activeSelection = this.getActiveSelection();

    const rows = this.sortRows(
      this.filterRows(this.buildRows(selected), this.searchTerm),
      this.sortState
    );

    return renderOverviewPanelContent({
      h,
      Input,
      datasets,
      selectedDataset: selected,
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
      onSelectRow: (selection: RegionSelection) => this.onSelectRegion(selection, "overview-click"),
      formatNullableNumber: (value: number | null | undefined, decimals = 0) =>
        value !== null && value !== undefined ? formatFixedNumber(value, decimals) : "N/A",
    });
  }

  private buildRows(dataset: RegionDataset | null): RegionsOverviewRow[] {
    if (!dataset) {
      return [];
    }

    const datasetId = RegionDataset.getIdentifier(dataset);
    return Array.from(dataset.gameData.values()).map((gameData) => {
      const densityBasePopulation = gameData.demandData?.residents ?? gameData.realPopulation;
      const density = (densityBasePopulation !== null && densityBasePopulation !== undefined && gameData.gameArea)
        ? densityBasePopulation / gameData.gameArea
        : null;
      const infraSummary = gameData.infraData
        ? `S:${gameData.infraData.stations.size} R:${gameData.infraData.routes.size}`
        : null;

      return {
        selection: {
          datasetId,
          featureId: gameData.featureId,
        },
        gameData,
        density,
        infraSummary,
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

  private resolveSelectedDataset(datasets: RegionDataset[]): RegionDataset | null {
    if (datasets.length === 0) {
      this.selectedDatasetId = null;
      return null;
    }

    if (!this.selectedDatasetId) {
      this.selectedDatasetId = datasets[0].id;
      return datasets[0];
    }

    const selected = datasets.find((dataset) => dataset.id === this.selectedDatasetId) ?? null;
    if (selected) {
      return selected;
    }

    this.selectedDatasetId = datasets[0].id;
    return datasets[0];
  }
}
