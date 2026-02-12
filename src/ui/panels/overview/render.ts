import type React from "react";
import { createElement } from "react";
import { RegionSelection as RegionSelectionUtils, type RegionSelection } from "../../../core/types";
import { DataRowOptions, DataTableRow, ReactDataTable, TableOptions } from "../../elements/DataTable";
import { ReactSelectButtonConfig, ReactSelectRow } from "../../elements/SelectRow";
import type { RegionsOverviewRow, RegionsOverviewSortState, RegionsOverviewTab } from "./types";
import { formatNumberOrDefault } from "../../../core/utils";

export type InputFieldProperties = {
  value?: string;
  placeholder?: string;
  onChange?: (e: Event) => void;
  className?: string;
};

export function renderLayerSelectorRow(
  h: typeof createElement,
  datasetIdentifiers: string[],
  selectedDatasetIdentifier: string,
  getDatasetLabel: (datasetIdentifier: string) => string,
  onSelectDataset: (datasetIdentifier: string) => void,
): React.ReactNode {
  if (datasetIdentifiers.length === 0) {
    return h(
      "div",
      { className: "rounded-md border border-border/60 px-2 py-2 text-xs text-muted-foreground" },
      "Load a city with region datasets to enable layer and table controls."
    );
  }

  if (datasetIdentifiers.length <= 5) {
    const buttonConfigs: Map<string, ReactSelectButtonConfig> = new Map();
    datasetIdentifiers.forEach((datasetIdentifier) => {
      buttonConfigs.set(datasetIdentifier, {
        label: getDatasetLabel(datasetIdentifier),
        onSelect: () => onSelectDataset(datasetIdentifier),
      });
    });

    return h(
      "div",
      { className: "flex flex-col gap-1.5" },
      h("div", { className: "text-xs font-medium text-muted-foreground" }, "Region Layer"),
      ReactSelectRow(h, buttonConfigs, selectedDatasetIdentifier, "regions-overview-layer-select")
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
        value: selectedDatasetIdentifier,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
          const target = e.target as HTMLSelectElement;
          onSelectDataset(target.value || "");
        },
      },
      ...datasetIdentifiers.map((datasetIdentifier) =>
        h(
          "option",
          { key: datasetIdentifier, value: datasetIdentifier },
          getDatasetLabel(datasetIdentifier)
        )
      )
    )
  );
}

export function renderOverviewTabs(
  h: typeof createElement,
  activeTab: RegionsOverviewTab,
  onSetTab: (tab: RegionsOverviewTab) => void,
): React.ReactNode {
  const tabOptions: Map<string, ReactSelectButtonConfig> = new Map();
  tabOptions.set("overview", {
    label: "Overview",
    onSelect: () => onSetTab("overview"),
  });
  tabOptions.set("commuter-flows", {
    label: "Commuter Flows",
    onSelect: () => onSetTab("commuter-flows"),
  });
  tabOptions.set("ridership", {
    label: "Ridership",
    onSelect: () => onSetTab("ridership"),
  });

  return ReactSelectRow(h, tabOptions, activeTab, "regions-overview-tab-select", true);
}

export function renderOverviewSearchField(
  h: typeof createElement,
  Input: React.ComponentType<InputFieldProperties>,
  searchTerm: string,
  onSearchTermChange: (value: string) => void,
): React.ReactNode {
  return h(Input, {
    value: searchTerm,
    placeholder: "Search by name...",
    onChange: (e: Event) => {
      const target = e.target as HTMLInputElement;
      onSearchTermChange(target.value);
    },
  });
}

export function renderOverviewTable(
  h: typeof createElement,
  rows: RegionsOverviewRow[],
  activeSelection: RegionSelection | null,
  sortState: RegionsOverviewSortState,
  onSortChange: (columnIndex: number) => void,
  onSelectRow: (selection: RegionSelection) => void,
): React.ReactNode {
  const tableOptions: TableOptions = {
    columnTemplate: "minmax(10rem,1.2fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr) minmax(5rem,0.7fr)",
    density: "compact"
  };

  const sortHandlers = [
    () => onSortChange(0),
    () => onSortChange(1),
    () => onSortChange(2),
    () => onSortChange(3),
    () => onSortChange(4),
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
        colSpan: [5],
        align: ["left"],
        rowClassName: "text-xs text-muted-foreground",
      },
    });
  } else {
    rows.forEach((row) => {
      const isActive = activeSelection !== null && RegionSelectionUtils.isEqual(activeSelection, row.selection);
      const rowAction = () => onSelectRow(row.selection);
      const rowOptions: DataRowOptions = {
        onClick: [rowAction, rowAction, rowAction, rowAction, rowAction],
        align: ["left", "right", "right", "right", "right"],
        rowClassName: isActive
          ? "bg-secondary-foreground/15 text-foreground cursor-pointer"
          : "hover:bg-accent/60 cursor-pointer",
      };

      tableRows.push({
        rowValues: [
          row.gameData.displayName,
          formatNumberOrDefault(row.gameData.realPopulation),
          formatNumberOrDefault(row.gameData.demandData?.residents ?? null),
          formatNumberOrDefault(row.gameData.demandData?.workers ?? null),
          formatNumberOrDefault(row.gameData.area, 2),
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

export function renderPlaceholderTab(
  h: typeof createElement,
  description: string
): React.ReactNode {
  return h(
    "div",
    { className: "rounded-md border border-border/60 px-2 py-3 text-xs text-muted-foreground" },
    description
  );
}
