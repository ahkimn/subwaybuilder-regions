import type React from 'react';
import { type createElement, type useEffect, type useState } from 'react';

import { REGIONS_OVERVIEW_PANEL_CONTENT_ID } from '../../../core/constants';
import type { RegionDataManager } from '../../../core/datasets/RegionDataManager';
import {
  RegionDataType,
  type RegionSelection,
  type UIState,
} from '../../../core/types';
import type { ModdingAPI } from '../../../types/modding-api-v1';
import { buildReactViewHeader } from '../shared/view-header';
import type { SortState } from '../types';
import { DEFAULT_SORT_STATE } from '../types';
import { renderLayerSelectorRow, renderOverviewTabs } from './render';
import { renderHistoricalTabContent } from './render-historical';
import type { InputFieldProperties } from './render-overview';
import {
  getNextOverviewSortState,
  renderOverviewTabContent,
} from './render-overview';
import { renderRidershipTabContent } from './render-ridership';
import type { RegionsOverviewPanelState, RegionsOverviewTab } from './types';
import { RegionsOverviewTab as RegionsOverviewTabs } from './types';

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
  const [sortState, setSortState] = useStateHook<SortState>(
    props.initialState?.sortState ?? DEFAULT_SORT_STATE,
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

  const onSortChange = (columnIndex: number) => {
    setSortState((current) => getNextOverviewSortState(current, columnIndex));
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
      tabContent = renderOverviewTabContent(
        h,
        useStateHook,
        Input,
        datasetGameData,
        selectedDatasetIdentifier,
        activeSelection,
        sortState,
        searchTerm,
        setSearchTerm,
        onSortChange,
        props.onRegionSelect,
      );
      break;
    case RegionsOverviewTabs.HistoricalData:
      tabContent = renderHistoricalTabContent(h);
      break;
    case RegionsOverviewTabs.Ridership:
    default:
      tabContent = renderRidershipTabContent(h);
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
