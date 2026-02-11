import { RegionSelection as RegionSelectionUtils, type RegionSelection } from "../../../core/types";
import { RegionDataset } from "../../../core/datasets/RegionDataset";
import { formatFixedNumber } from "../../../core/utils";
import type { ModdingAPI } from "../../../types/modding-api-v1";
import { DataRowOptions, TableOptions } from "../../elements/DataTable";
import { ReactDataTable, ReactDataTableRow } from "../../elements/ReactDataTable";
import { ReactSelectRow, ReactSelectRowOption } from "../../elements/ReactSelectRow";
import type { RegionsOverviewRow, RegionsOverviewSortState, RegionsOverviewTab } from "./types";

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

  render(): unknown {
    const h = this.api.utils.React.createElement;
    const components = this.api.utils.components;

    const cityCode = this.getCurrentCityCode();
    const datasets = cityCode ? this.getCityDatasets(cityCode) : [];
    const selected = this.resolveSelectedDataset(datasets);
    const activeSelection = this.getActiveSelection();

    return h(
      "div",
      { className: "p-3 flex flex-col gap-3 h-full min-h-0" },
      this.renderLayerRow(h, selected, datasets),
      this.renderTabs(h),
      this.renderTabContent(h, components, selected, activeSelection)
    );
  }

  private renderLayerRow(
    h: (...args: unknown[]) => unknown,
    selected: RegionDataset | null,
    datasets: RegionDataset[]
  ): unknown {
    if (datasets.length === 0) {
      return h(
        "div",
        { className: "rounded-md border border-border/60 px-2 py-2 text-xs text-muted-foreground" },
        "Load a city with region datasets to enable layer and table controls."
      );
    }

    if (datasets.length <= 5) {
      const layerOptions: ReactSelectRowOption[] = datasets.map((dataset) => ({
        id: dataset.id,
        label: dataset.displayName,
        onSelect: () => {
          if (this.selectedDatasetId === dataset.id) return;
          this.selectedDatasetId = dataset.id;
          this.requestRender();
        },
      }));

      return h(
        "div",
        { className: "flex flex-col gap-1.5" },
        h("div", { className: "text-xs font-medium text-muted-foreground" }, "Region Layer"),
        ReactSelectRow({
          h,
          id: "regions-overview-layer-select",
          options: layerOptions,
          activeId: selected?.id ?? null,
        })
      );
    }

    return h(
      "div",
      { className: "flex flex-col gap-1.5" },
      h("div", { className: "text-xs font-medium text-muted-foreground" }, "Region Layer"),
      h(
        "select",
        {
          className:
            "h-9 rounded-md border border-border/60 bg-background px-2 text-sm outline-none focus:border-ring",
          value: selected?.id ?? "",
          onChange: (e: Event) => {
            const target = e.target as HTMLSelectElement;
            this.selectedDatasetId = target.value || null;
            this.requestRender();
          },
        },
        ...datasets.map((dataset) =>
          h(
            "option",
            { key: dataset.id, value: dataset.id },
            dataset.displayName
          )
        )
      )
    );
  }

  private renderTabs(h: (...args: unknown[]) => unknown): unknown {
    const tabOptions: ReactSelectRowOption[] = [
      { id: "overview", label: "Overview", onSelect: () => this.setTab("overview") },
      { id: "commuter-flows", label: "Commuter Flows", onSelect: () => this.setTab("commuter-flows") },
      { id: "ridership", label: "Ridership", onSelect: () => this.setTab("ridership") },
    ];

    return ReactSelectRow({
      h,
      id: "regions-overview-tab-select",
      options: tabOptions,
      activeId: this.activeTab,
      fullWidth: true,
    });
  }

  private renderTabContent(
    h: (...args: unknown[]) => unknown,
    components: ModdingAPI["utils"]["components"],
    dataset: RegionDataset | null,
    activeSelection: RegionSelection | null
  ): unknown {
    switch (this.activeTab) {
      case "overview":
        return this.renderOverviewTab(h, components, dataset, activeSelection);
      case "commuter-flows":
        return this.renderPlaceholderTab(h, "Commuter flow analysis is under construction.");
      case "ridership":
        return this.renderPlaceholderTab(h, "Ridership analysis is under construction.");
    }
  }

  private renderOverviewTab(
    h: (...args: unknown[]) => unknown,
    components: ModdingAPI["utils"]["components"],
    dataset: RegionDataset | null,
    activeSelection: RegionSelection | null
  ): unknown {
    const rows = this.sortRows(
      this.filterRows(this.buildRows(dataset), this.searchTerm),
      this.sortState
    );

    return h(
      "div",
      { className: "flex flex-col gap-2 min-h-0" },
      h(components.Input, {
        value: this.searchTerm,
        placeholder: "Search by name...",
        onChange: (e: Event) => {
          const target = e.target as HTMLInputElement;
          this.searchTerm = target.value;
          this.requestRender();
        },
      }),
      this.renderTable(h, rows, activeSelection)
    );
  }

  private renderTable(
    h: (...args: unknown[]) => unknown,
    rows: RegionsOverviewRow[],
    activeSelection: RegionSelection | null
  ): unknown {
    const tableOptions = new TableOptions(
      "minmax(10rem,1.2fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(6rem,0.8fr)",
      "compact"
    );

    const sortHandlers = [
      () => this.changeSort(0),
      () => this.changeSort(1),
      () => this.changeSort(2),
      () => this.changeSort(3),
      () => this.changeSort(4),
      () => this.changeSort(5),
      () => this.changeSort(6),
    ];

    const tableRows: ReactDataTableRow[] = [
      {
        rowValues: ["Region", "Real Pop", "Residents", "Workers", "Area", "Density", "Infra"],
        options: {
          header: true,
          borderBottom: true,
          onClick: sortHandlers,
          align: ["left", "right", "right", "right", "right", "right", "right"],
          sortState: {
            index: this.sortState.sortIndex,
            directionLabel: this.sortState.sortDirection === "asc" ? "^" : "v",
            sortSelectedClass: "text-foreground",
          },
        },
      },
    ];

    if (rows.length === 0) {
      tableRows.push({
        rowValues: ["No rows match the current filters."],
        options: {
          colSpan: [7],
          align: ["left"],
          rowClassName: "text-xs text-muted-foreground",
        },
      });
    } else {
      rows.forEach((row) => {
        const isActive = activeSelection !== null && RegionSelectionUtils.isEqual(activeSelection, row.selection);
        const rowAction = () => this.onSelectRegion(row.selection, "overview-click");
        const rowOptions: DataRowOptions = {
          onClick: [rowAction, rowAction, rowAction, rowAction, rowAction, rowAction, rowAction],
          align: ["left", "right", "right", "right", "right", "right", "right"],
          rowClassName: isActive
            ? "bg-secondary-foreground/15 text-foreground cursor-pointer"
            : "hover:bg-accent/60 cursor-pointer",
        };

        tableRows.push({
          rowValues: [
            row.gameData.displayName,
            this.formatNullableNumber(row.gameData.realPopulation),
            this.formatNullableNumber(row.gameData.demandData?.residents ?? null),
            this.formatNullableNumber(row.gameData.demandData?.workers ?? null),
            this.formatNullableNumber(row.gameData.area, 2),
            this.formatNullableNumber(row.density, 1),
            row.infraSummary ?? "--",
          ],
          options: rowOptions,
        });
      });
    }

    return h(
      "div",
      { className: "rounded-md border border-border/60 overflow-hidden min-h-0" },
      h(
        "div",
        { className: "overflow-auto max-h-[60vh] px-1.5 py-1" },
        ReactDataTable(h, tableOptions, tableRows)
      )
    );
  }

  private renderPlaceholderTab(
    h: (...args: unknown[]) => unknown,
    description: string
  ): unknown {
    return h(
      "div",
      { className: "rounded-md border border-border/60 px-2 py-3 text-xs text-muted-foreground" },
      description
    );
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
          return this.compareNullableNumber(a.gameData.realPopulation, b.gameData.realPopulation) * multiplier;
        case 2:
          return this.compareNullableNumber(a.gameData.demandData?.residents ?? null, b.gameData.demandData?.residents ?? null) * multiplier;
        case 3:
          return this.compareNullableNumber(a.gameData.demandData?.workers ?? null, b.gameData.demandData?.workers ?? null) * multiplier;
        case 4:
          return this.compareNullableNumber(a.gameData.area, b.gameData.area) * multiplier;
        case 5:
          return this.compareNullableNumber(a.density, b.density) * multiplier;
        case 6:
          return (a.infraSummary ?? "").localeCompare(b.infraSummary ?? "") * multiplier;
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

  private compareNullableNumber(a: number | null | undefined, b: number | null | undefined): number {
    const aMissing = a === null || a === undefined;
    const bMissing = b === null || b === undefined;

    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return a - b;
  }

  private formatNullableNumber(value: number | null | undefined, decimals = 0): string {
    if (value === null || value === undefined) {
      return "--";
    }
    return formatFixedNumber(value, decimals);
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
