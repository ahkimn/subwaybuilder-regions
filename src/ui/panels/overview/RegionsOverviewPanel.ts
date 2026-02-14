import type React from 'react';
import type { createElement, useState } from 'react';

import {
  REGIONS_OVERVIEW_PANEL_CONTENT_ID,
  SHOW_UNPOPULATED_REGIONS,
} from '../../../core/constants';
import type { RegionDataManager } from '../../../core/datasets/RegionDataManager';
import {
  type RegionGameData,
  RegionGameData as RegionGameDataUtils,
  type RegionSelection,
  type UIState,
} from '../../../core/types';
import type { ModdingAPI } from '../../../types/modding-api-v1';
import type { InputFieldProperties } from './render';
import {
  renderLayerSelectorRow,
  renderOverviewSearchField,
  renderOverviewTable,
  renderOverviewTabs,
  renderPlaceholderTab,
} from './render';
import type {
  RegionsOverviewRow,
  RegionsOverviewSortState,
  RegionsOverviewTab,
} from './types';

const INITIAL_SORT_STATE: RegionsOverviewSortState = {
  sortIndex: 0,
  previousSortIndex: 1,
  sortDirection: 'asc',
  previousSortDirection: 'desc',
};

export type RegionsOverviewPanelProps = {
  api: ModdingAPI;
  uiState: Readonly<UIState>;
  regionDataManager: RegionDataManager;
  availableDatasetIdentifiers: string[];
  onRegionSelect: (selection: RegionSelection) => void;
};

export function renderRegionsOverviewPanel(
  props: RegionsOverviewPanelProps,
): React.ReactNode {
  if (props.availableDatasetIdentifiers.length === 0) {
    return null;
  }

  const h = props.api.utils.React.createElement as typeof createElement;
  const useStateHook = props.api.utils.React.useState as typeof useState;
  const Input = props.api.utils.components
    .Input as React.ComponentType<InputFieldProperties>;

  const [selectedDatasetIdentifier, setSelectedDatasetIdentifier] =
    useStateHook<string>(props.availableDatasetIdentifiers[0]);
  const [searchTerm, setSearchTerm] = useStateHook<string>('');
  const [activeTab, setActiveTab] = useStateHook<RegionsOverviewTab>('overview');
  const [sortState, setSortState] =
    useStateHook<RegionsOverviewSortState>(INITIAL_SORT_STATE);

  const datasetGameData = props.regionDataManager.requestGameDataByDataset(
    selectedDatasetIdentifier,
  );
  const activeSelection = props.uiState.activeSelection;

  const rows = sortRows(
    filterRows(buildRows(datasetGameData, selectedDatasetIdentifier), searchTerm),
    sortState,
  );

  const onSortChange = (columnIndex: number) => {
    setSortState((current) => {
      if (current.sortIndex === columnIndex) {
        return {
          ...current,
          sortDirection: current.sortDirection === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        previousSortIndex: current.sortIndex,
        previousSortDirection: current.sortDirection,
        sortIndex: columnIndex,
        sortDirection: columnIndex === 0 ? 'asc' : 'desc',
      };
    });
  };

  const onSetTab = (tab: RegionsOverviewTab) => {
    setActiveTab((current) => (current === tab ? current : tab));
  };

  const onSelectDataset = (datasetIdentifier: string) => {
    if (datasetIdentifier === selectedDatasetIdentifier) return;
    setSelectedDatasetIdentifier(datasetIdentifier);
  };

  let tabContent: React.ReactNode;
  switch (activeTab) {
    case 'overview':
      tabContent = h(
        'div',
        { className: 'flex flex-col gap-2 min-h-0' },
        renderOverviewSearchField(h, Input, searchTerm, setSearchTerm),
        renderOverviewTable(
          h,
          useStateHook,
          rows,
          activeSelection,
          sortState,
          onSortChange,
          props.onRegionSelect,
        ),
      );
      break;
    case 'commuter-flows':
      tabContent = renderPlaceholderTab(
        h,
        'Commuter flow analysis is under construction.',
      );
      break;
    case 'ridership':
    default:
      tabContent = renderPlaceholderTab(
        h,
        'Ridership analysis is under construction.',
      );
      break;
  }

  return h(
    'div',
    {
      id: REGIONS_OVERVIEW_PANEL_CONTENT_ID,
      className: 'p-3 flex flex-col gap-3 h-full min-h-0',
    },
    renderLayerSelectorRow(
      h,
      props.availableDatasetIdentifiers,
      selectedDatasetIdentifier,
      (datasetIdentifier: string) =>
        props.regionDataManager.getDatasetDisplayName(datasetIdentifier),
      onSelectDataset,
    ),
    renderOverviewTabs(h, activeTab, onSetTab),
    tabContent,
  );
}

function buildRows(
  datasetGameData: Map<string | number, RegionGameData>,
  selectedDatasetIdentifier: string,
): RegionsOverviewRow[] {
  const rowsData = SHOW_UNPOPULATED_REGIONS
    ? Array.from(datasetGameData.values())
    : Array.from(datasetGameData.values()).filter((gameData) =>
        RegionGameDataUtils.isPopulated(gameData),
      );

  return rowsData.map((gameData) => {
    return {
      selection: {
        datasetIdentifier: selectedDatasetIdentifier,
        featureId: gameData.featureId,
      },
      gameData,
    };
  });
}

function filterRows(
  rows: RegionsOverviewRow[],
  searchTerm: string,
): RegionsOverviewRow[] {
  const trimmed = searchTerm.trim().toLowerCase();
  if (!trimmed) {
    return rows;
  }

  return rows.filter(
    (row) =>
      row.gameData.displayName.toLowerCase().includes(trimmed) ||
      row.gameData.fullName.toLowerCase().includes(trimmed),
  );
}

function sortRows(
  rows: RegionsOverviewRow[],
  sortState: RegionsOverviewSortState,
): RegionsOverviewRow[] {
  const applySort = (
    a: RegionsOverviewRow,
    b: RegionsOverviewRow,
    index: number,
    direction: 'asc' | 'desc',
  ): number => {
    const multiplier = direction === 'asc' ? 1 : -1;
    switch (index) {
      case 1:
        return (
          ((a.gameData.realPopulation ?? 0) - (b.gameData.realPopulation ?? 0)) *
          multiplier
        );
      case 2:
        return (
          ((a.gameData.demandData?.residents ?? 0) -
            (b.gameData.demandData?.residents ?? 0)) *
          multiplier
        );
      case 3:
        return (
          ((a.gameData.demandData?.workers ?? 0) -
            (b.gameData.demandData?.workers ?? 0)) *
          multiplier
        );
      case 4:
        return ((a.gameData.area ?? 0) - (b.gameData.area ?? 0)) * multiplier;
      case 0:
      default:
        return (
          a.gameData.displayName.localeCompare(b.gameData.displayName) *
          multiplier
        );
    }
  };

  return [...rows].sort((a, b) => {
    let result = applySort(
      a,
      b,
      sortState.sortIndex,
      sortState.sortDirection,
    );
    if (result === 0) {
      result = applySort(
        a,
        b,
        sortState.previousSortIndex,
        sortState.previousSortDirection,
      );
    }
    if (result === 0) {
      result = a.gameData.displayName.localeCompare(b.gameData.displayName);
    }
    return result;
  });
}
