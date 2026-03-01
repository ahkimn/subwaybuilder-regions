import type React from 'react';

import { REGIONS_OVERVIEW_PANEL_CONTENT_ID } from '@/core/constants';
import type { RegionDataManager } from '@/core/datasets/RegionDataManager';
import {
  RegionDataType,
  type RegionSelection,
  type UIState,
} from '@/core/domain';
import type { ModdingAPI } from '@/types/api';
import { getGameReact } from '@/ui/react/get-game-react';

import { ViewHeader } from '../../elements/ViewHeader';
import { getNextSortState } from '../shared/sort';
import type { InputFieldProperties, SortState } from '../types';
import { DEFAULT_SORT_STATE } from '../types';
import { renderLayerSelectorRow, renderOverviewTabs } from './render-tabs';
import { renderHistoricalTabContent } from './tabs/historical-data';
import type { OverviewSortMetrics } from './tabs/overview';
import { renderOverviewTabContent, resolveSortConfig } from './tabs/overview';
import { renderRidershipTabContent } from './tabs/ridership';
import type { RegionsOverviewPanelState, RegionsOverviewTab } from './types';
import { RegionsOverviewTab as RegionsOverviewTabs } from './types';

export type RegionsOverviewPanelProps = {
  api: ModdingAPI;
  uiState: Readonly<UIState>;
  regionDataManager: RegionDataManager;
  availableDatasetIdentifiers: string[];
  onRegionSelect: (selection: RegionSelection, toggleIfSame: boolean) => void;
  onRegionDoubleClick: (selection: RegionSelection) => void;
  initialState?: RegionsOverviewPanelState | null;
  onStateChange?: (nextState: RegionsOverviewPanelState) => void;
};

export function renderRegionsOverviewPanel(
  props: RegionsOverviewPanelProps,
): React.ReactNode {
  if (props.availableDatasetIdentifiers.length === 0) {
    return null;
  }

  const { h, useEffectHook, useStateHook } = getGameReact(props.api);
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
    setSortState((current) =>
      getNextSortState<OverviewSortMetrics>(
        current,
        columnIndex,
        resolveSortConfig,
      ),
    );
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
        props.onRegionDoubleClick,
        props.uiState.settings.showUnpopulatedRegions,
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
    ViewHeader(h, 'Dataset', undefined, [
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
