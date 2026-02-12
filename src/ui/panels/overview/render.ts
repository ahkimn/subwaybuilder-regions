import type React from "react";
import { createElement } from "react";
import { RegionSelection as RegionSelectionUtils, type RegionSelection } from "../../../core/types";
import { REGIONS_OVERVIEW_PANEL_CONTENT_ID } from "../../../core/constants";
import { DataRowOptions, DataTableRow, ReactDataTable, TableOptions } from "../../elements/DataTable";
import { ReactSelectButtonConfig, ReactSelectRow } from "../../elements/SelectRow";
import type { RegionsOverviewRow, RegionsOverviewSortState, RegionsOverviewTab } from "./types";
import { formatFixedNumber } from "../../../core/utils";

export type InputFieldProperties = {
  value?: string;
  placeholder?: string;
  onChange?: (e: Event) => void;
  className?: string;
};

type RenderOverviewPanelArgs = {
  h: typeof createElement;
  Input: React.ComponentType<InputFieldProperties>;
  datasetIds: string[];
  selectedDatasetId: string;
  activeSelection: RegionSelection | null;
  activeTab: RegionsOverviewTab;
  searchTerm: string;
  sortState: RegionsOverviewSortState;
  rows: RegionsOverviewRow[];
  onSelectDataset: (datasetId: string) => void;
  onSetTab: (tab: RegionsOverviewTab) => void;
  onSearchTermChange: (value: string) => void;
  onSortChange: (columnIndex: number) => void;
  onSelectRow: (selection: RegionSelection) => void
};

export function renderOverviewPanelContent(args: RenderOverviewPanelArgs): React.ReactNode {
  return args.h(
    "div",
    { id: REGIONS_OVERVIEW_PANEL_CONTENT_ID, className: "p-3 flex flex-col gap-3 h-full min-h-0" },
    renderLayerRow(args),
    renderTabs(args),
    renderTabContent(args)
  );
}

function renderLayerRow(args: RenderOverviewPanelArgs): React.ReactNode {
  const { h, datasetIds, selectedDatasetId } = args;

  if (datasetIds.length === 0) {
    return h(
      "div",
      { className: "rounded-md border border-border/60 px-2 py-2 text-xs text-muted-foreground" },
      "Load a city with region datasets to enable layer and table controls."
    );
  }

  if (datasetIds.length <= 5) {
    const buttonConfigs: Map<string, ReactSelectButtonConfig> = new Map();
    datasetIds.forEach((datasetId) => {
      buttonConfigs.set(datasetId, {
        label: datasetId,
        onSelect: () => args.onSelectDataset(datasetId),
      });
    });

    return h(
      "div",
      { className: "flex flex-col gap-1.5" },
      h("div", { className: "text-xs font-medium text-muted-foreground" }, "Region Layer"),
      ReactSelectRow(h, buttonConfigs, selectedDatasetId, "regions-overview-layer-select")
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
        value: selectedDatasetId,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
          const target = e.target as HTMLSelectElement;
          args.onSelectDataset(target.value || "");
        },
      },
      ...datasetIds.map((datasetId) =>
        h(
          "option",
          { key: datasetId, value: datasetId },
          datasetId
        )
      )
    )
  );
}

function renderTabs(args: RenderOverviewPanelArgs): React.ReactNode {
  const tabOptions: Map<string, ReactSelectButtonConfig> = new Map();
  tabOptions.set("overview", {
    label: "Overview",
    onSelect: () => args.onSetTab("overview"),
  });
  tabOptions.set("commuter-flows", {
    label: "Commuter Flows",
    onSelect: () => args.onSetTab("commuter-flows"),
  });
  tabOptions.set("ridership", {
    label: "Ridership",
    onSelect: () => args.onSetTab("ridership"),
  });

  return ReactSelectRow(args.h, tabOptions, args.activeTab, "regions-overview-tab-select", true);
}

function renderTabContent(args: RenderOverviewPanelArgs): React.ReactNode {
  switch (args.activeTab) {
    case "overview":
      return renderOverviewTab(args);
    case "commuter-flows":
      return renderPlaceholderTab(args.h, "Commuter flow analysis is under construction.");
    case "ridership":
      return renderPlaceholderTab(args.h, "Ridership analysis is under construction.");
  }
}

function renderOverviewTab(args: RenderOverviewPanelArgs): React.ReactNode {
  const { h, Input } = args;

  return h(
    "div",
    { className: "flex flex-col gap-2 min-h-0" },
    h(Input, {
      value: args.searchTerm,
      placeholder: "Search by name...",
      onChange: (e: Event) => {
        const target = e.target as HTMLInputElement;
        args.onSearchTermChange(target.value);
      },
    }),
    renderTable(args)
  );
}

function renderTable(args: RenderOverviewPanelArgs): React.ReactNode {
  const { h, rows, activeSelection, sortState } = args;

  const tableOptions: TableOptions = {
    columnTemplate: "minmax(10rem,1.2fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(6rem,0.8fr)",
    density: "compact"
  };

  const sortHandlers = [
    () => args.onSortChange(0),
    () => args.onSortChange(1),
    () => args.onSortChange(2),
    () => args.onSortChange(3),
    () => args.onSortChange(4),
  ];

  const tableRows: DataTableRow[] = [
    {
      rowValues: ["Region", "Real Pop", "Residents", "Workers", "Area"],
      options: {
        header: true,
        borderBottom: true,
        onClick: sortHandlers,
        align: ["left", "right", "right", "right", "right"],
        sortState: {
          index: sortState.sortIndex,
          directionLabel: sortState.sortDirection === "asc" ? "^" : "v",
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
      const rowAction = () => args.onSelectRow(row.selection);
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
          row.gameData.realPopulation ? formatFixedNumber(row.gameData.realPopulation) : "N/A",
          row.gameData.demandData?.residents ? formatFixedNumber(row.gameData.demandData.residents) : "N/A",
          row.gameData.demandData?.workers ? formatFixedNumber(row.gameData.demandData.workers) : "N/A",
          row.gameData.area ? formatFixedNumber(row.gameData.area, 2) : "N/A",
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

function renderPlaceholderTab(
  h: typeof createElement,
  description: string
): React.ReactNode {
  return h(
    "div",
    { className: "rounded-md border border-border/60 px-2 py-3 text-xs text-muted-foreground" },
    description
  );
}
