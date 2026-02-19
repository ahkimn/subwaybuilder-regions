import type React from 'react';
import { type createElement, type useEffect, type useState } from 'react';

import {
  REGIONS_OVERVIEW_PANEL_CONTENT_ID,
  SHOW_UNPOPULATED_REGIONS,
} from '../../../core/constants';
import type { RegionDataManager } from '../../../core/datasets/RegionDataManager';
import {
  ModeShare,
  RegionDataType,
  type RegionGameData,
  RegionGameData as RegionGameDataUtils,
  type RegionSelection,
  type UIState,
} from '../../../core/types';
import type { ModdingAPI } from '../../../types/modding-api-v1';
import { buildReactViewHeader } from '../shared/view-header';
import { SortDirection } from '../types';
import type { InputFieldProperties } from './render';
import {
  renderLayerSelectorRow,
  renderOverviewSearchField,
  renderOverviewTable,
  renderOverviewTabs,
  renderPlaceholderTab,
} from './render';
import type {
  RegionsOverviewPanelState,
  RegionsOverviewRow,
  RegionsOverviewSortState,
  RegionsOverviewTab,
} from './types';
import { RegionsOverviewTab as RegionsOverviewTabs } from './types';

const INITIAL_SORT_STATE: RegionsOverviewSortState = {
  sortIndex: 0,
  previousSortIndex: 1,
  sortDirection: SortDirection.Asc,
  previousSortDirection: SortDirection.Desc,
};

export type RegionsOverviewPanelProps = {
  api: ModdingAPI;
  uiState: Readonly<UIState>;
  regionDataManager: RegionDataManager;
  availableDatasetIdentifiers: string[];
  onRegionSelect: (selection: RegionSelection) => void;
  initialState?: RegionsOverviewPanelState | null;
  onStateChange?: (nextState: RegionsOverviewPanelState) => void;
};

export function renderRegionsOverviewPanel(
  props: RegionsOverviewPanelProps,
): React.ReactNode {
  if (props.availableDatasetIdentifiers.length === 0) {
    return null;
  }

  const h = props.api.utils.React.createElement as typeof createElement;
  const useStateHook = props.api.utils.React.useState as typeof useState;
  const useEffectHook = props.api.utils.React.useEffect as typeof useEffect;
  const Input = props.api.utils.components
    .Input as React.ComponentType<InputFieldProperties>;

  const resolveInitialDatasetIdentifier = (): string => {
    const prevStateIdentifier = props.initialState?.selectedDatasetIdentifier;
    if (!prevStateIdentifier) {
      return props.availableDatasetIdentifiers[0];
    }
    if (!props.availableDatasetIdentifiers.includes(prevStateIdentifier)) {
      throw new Error(
        `[Regions] Overview panel state references unknown dataset identifier ${prevStateIdentifier}`,
      );
    }
    return prevStateIdentifier;
  };

  const [selectedDatasetIdentifier, setSelectedDatasetIdentifier] =
    useStateHook<string>(resolveInitialDatasetIdentifier);
  const [searchTerm, setSearchTerm] = useStateHook<string>(
    props.initialState?.searchTerm ?? '',
  );
  const [activeTab, setActiveTab] = useStateHook<RegionsOverviewTab>(
    () => props.initialState?.activeTab ?? RegionsOverviewTabs.Overview,
  );
  const [, setSummaryRenderToken] = useStateHook<number>(0);
  const [sortState, setSortState] = useStateHook<RegionsOverviewSortState>(
    props.initialState?.sortState ?? INITIAL_SORT_STATE,
  );

  useEffectHook(() => {
    if (!props.onStateChange) return;
    props.onStateChange({
      selectedDatasetIdentifier,
      searchTerm,
      activeTab,
      sortState: { ...sortState },
    });
  }, [
    selectedDatasetIdentifier,
    searchTerm,
    activeTab,
    sortState,
    props.onStateChange,
  ]);

  useEffectHook(() => {
    if (activeTab !== RegionsOverviewTabs.Overview) {
      return;
    }

    let cancelled = false;

    void props.regionDataManager
      .ensureExistsDataForDataset(
        selectedDatasetIdentifier,
        RegionDataType.CommuterSummary,
        { forceBuild: false },
      )
      .then((summaryResult) => {
        if (cancelled) return;
        if (summaryResult !== null) {
          setSummaryRenderToken((current) => current + 1);
        }
      });

    void props.regionDataManager
      .ensureExistsDataForDataset(
        selectedDatasetIdentifier,
        RegionDataType.Infra,
        { forceBuild: false },
      )
      .then((infraResult) => {
        if (cancelled) return;
        if (infraResult !== null) {
          setSummaryRenderToken((current) => current + 1);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    selectedDatasetIdentifier,
    setSummaryRenderToken,
    props.regionDataManager,
  ]);

  const datasetGameData = props.regionDataManager.requestGameDataByDataset(
    selectedDatasetIdentifier,
  );
  const activeSelection = props.uiState.activeSelection;

  const rows = sortRows(
    filterRows(
      buildRows(datasetGameData, selectedDatasetIdentifier),
      searchTerm,
    ),
    sortState,
  );

  const onSortChange = (columnIndex: number) => {
    setSortState((current) => {
      if (current.sortIndex === columnIndex) {
        return {
          ...current,
          sortDirection:
            current.sortDirection === SortDirection.Asc
              ? SortDirection.Desc
              : SortDirection.Asc,
        };
      }

      return {
        previousSortIndex: current.sortIndex,
        previousSortDirection: current.sortDirection,
        sortIndex: columnIndex,
        sortDirection:
          columnIndex === 0 ? SortDirection.Asc : SortDirection.Desc,
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
    case RegionsOverviewTabs.Overview:
      tabContent = h(
        'div',
        { className: 'flex flex-col gap-2 min-h-0 flex-1' },
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
    case RegionsOverviewTabs.CommuterFlows:
      tabContent = renderPlaceholderTab(
        h,
        'Commuter flow analysis is under construction.',
      );
      break;
    case RegionsOverviewTabs.Ridership:
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
    renderOverviewTabs(h, activeTab, onSetTab),
    buildReactViewHeader(h, 'Dataset', undefined, [
      renderLayerSelectorRow(
        h,
        props.availableDatasetIdentifiers,
        selectedDatasetIdentifier,
        (datasetIdentifier: string) =>
          props.regionDataManager.getDatasetDisplayName(datasetIdentifier),
        onSelectDataset,
      ),
    ]),
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
  const getTotalCommuters = (row: RegionsOverviewRow): number => {
    const residents = row.gameData.demandData?.residents;
    const workers = row.gameData.demandData?.workers;
    return (residents ?? 0) + (workers ?? 0);
  };

  const applySort = (
    a: RegionsOverviewRow,
    b: RegionsOverviewRow,
    index: number,
    direction: SortDirection,
  ): number => {
    const multiplier = direction === SortDirection.Asc ? 1 : -1;
    const aCommuterModeShare = ModeShare.add(
      a.gameData.commuterSummary?.residentModeShare ?? ModeShare.createEmpty(),
      a.gameData.commuterSummary?.workerModeShare ?? ModeShare.createEmpty(),
    );
    const bCommuterModeShare = ModeShare.add(
      b.gameData.commuterSummary?.residentModeShare ?? ModeShare.createEmpty(),
      b.gameData.commuterSummary?.workerModeShare ?? ModeShare.createEmpty(),
    );
    const aTrackLengths = a.gameData.infraData
      ? Array.from(a.gameData.infraData.trackLengths.values()).reduce(
          (sum, length) => sum + length,
          0,
        )
      : 0;
    const bTrackLengths = b.gameData.infraData
      ? Array.from(b.gameData.infraData.trackLengths.values()).reduce(
          (sum, length) => sum + length,
          0,
        )
      : 0;

    switch (index) {
      case 1:
        return (
          ((a.gameData.realPopulation ?? 0) -
            (b.gameData.realPopulation ?? 0)) *
          multiplier
        );
      case 2:
        return ((a.gameData.area ?? 0) - (b.gameData.area ?? 0)) * multiplier;
      case 3:
        return (getTotalCommuters(a) - getTotalCommuters(b)) * multiplier;
      case 4:
        return (
          ((a.gameData.demandData?.residents ?? 0) -
            (b.gameData.demandData?.residents ?? 0)) *
          multiplier
        );
      case 5:
        return (
          ((a.gameData.demandData?.workers ?? 0) -
            (b.gameData.demandData?.workers ?? 0)) *
          multiplier
        );
      case 6:
        return (
          (ModeShare.share(aCommuterModeShare, 'transit') -
            ModeShare.share(bCommuterModeShare, 'transit')) *
          multiplier
        );
      case 7:
        return (
          (ModeShare.share(aCommuterModeShare, 'driving') -
            ModeShare.share(bCommuterModeShare, 'driving')) *
          multiplier
        );
      case 8:
        return (
          (ModeShare.share(aCommuterModeShare, 'walking') -
            ModeShare.share(bCommuterModeShare, 'walking')) *
          multiplier
        );
      case 9:
        return (
          ((a.gameData.infraData?.stations.size ?? 0) -
            (b.gameData.infraData?.stations.size ?? 0)) *
          multiplier
        );
      case 10:
        return (aTrackLengths - bTrackLengths) * multiplier;
      case 11:
        return (
          ((a.gameData.infraData?.routes.size ?? 0) -
            (b.gameData.infraData?.routes.size ?? 0)) *
          multiplier
        );
      default:
        return (
          a.gameData.displayName.localeCompare(b.gameData.displayName) *
          multiplier
        );
    }
  };

  return [...rows].sort((a, b) => {
    let result = applySort(a, b, sortState.sortIndex, sortState.sortDirection);
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
