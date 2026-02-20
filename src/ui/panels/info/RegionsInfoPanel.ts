import {
  createElement,
  type ReactNode,
  useEffect,
  useReducer,
  useState,
} from 'react';

import {
  COMPACT_UI_THRESHOLD,
  INFO_PANEL_MIN_WIDTH,
  INFO_PANEL_VIEWPORT_HEIGHT_OFFSET_PX,
  INFO_PANEL_VIEWPORT_WIDTH_OFFSET_PX,
  LOADING_VALUE_DISPLAY,
  REGIONS_INFO_PANEL_ID,
  REGIONS_INFO_PANEL_TITLE,
  SANKEY_LABEL_FLOW_SYNC,
} from '../../../core/constants';
import type { RegionDataManager } from '../../../core/datasets/RegionDataManager';
import {
  RegionDataType,
  type RegionGameData,
  RegionSelection,
  type UIState,
} from '../../../core/types';
import { ReactPanelHeader } from '../../elements/PanelHeader';
import {
  ReactSelectRow,
  type SelectButtonConfig,
} from '../../elements/SelectRow';
import {
  createReactIconElement,
  FileChartColumnIcon,
  TramFrontIcon,
} from '../../elements/utils/get-icon';
import { DEFAULT_SORT_STATE, NumberDisplay, SortState } from '../types';
import { renderCommutersView } from './render-commuters';
import { renderStatisticsView } from './render-statistics';
import {
  CommuterDimension,
  CommuterDirection,
  CommuterDisplayMode,
  type CommutersViewAction,
  type CommutersViewState,
  RegionsInfoPanelView,
} from './types';

export type RegionsInfoPanelProps = {
  regionDataManager: RegionDataManager;
  uiState: Readonly<UIState>;
  onClose: () => void;
  forceRefreshToken: number;
};

export function RegionsInfoPanel({
  regionDataManager,
  uiState,
  onClose,
  forceRefreshToken,
}: RegionsInfoPanelProps): ReactNode {
  const [activeView, setActiveView] = useState<RegionsInfoPanelView>(
    RegionsInfoPanelView.Statistics,
  );
  const [gameData, setGameData] = useState<RegionGameData | null>(() =>
    getCurrentGameData(regionDataManager, uiState),
  );
  const [commutersViewState, dispatchCommutersViewAction] = useReducer(
    commutersViewReducer,
    undefined,
    createDefaultCommutersViewState,
  );
  const [viewportHeight, setViewportHeight] = useState<number>(
    window.innerHeight,
  );
  const [, setRenderToken] = useState<number>(0);

  const activeDatasetIdentifier = uiState.activeSelection?.datasetIdentifier;
  const activeFeatureId = uiState.activeSelection?.featureId;
  const isCompactViewport = viewportHeight <= COMPACT_UI_THRESHOLD;
  const infoPanelHeight = isCompactViewport
    ? `calc(100vh - ${INFO_PANEL_VIEWPORT_HEIGHT_OFFSET_PX}px)`
    : `min(calc(100vh - ${INFO_PANEL_VIEWPORT_HEIGHT_OFFSET_PX}px), 82vh)`;

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Info panel should only be rendered when there's an active selection
  if (!uiState.isActive) {
    console.error(
      '[Regions] Info panel render invoked with no active selection: ',
      uiState,
    );
    return null;
  }

  const resolveRegionName = (regionId: string | number): string => {
    return regionDataManager.resolveRegionName(
      activeDatasetIdentifier!,
      regionId,
    );
  };

  useEffect(() => {
    setGameData(getCurrentGameData(regionDataManager, uiState));
    const selectionSnapshot = uiState.activeSelection!;
    let cancelled = false;
    if (activeView === RegionsInfoPanelView.Statistics) {
      void regionDataManager
        .ensureExistsDataForSelection(uiState, RegionDataType.Infra, {
          forceBuild: false,
        })
        .then(() => {
          if (cancelled) return;
          if (
            !RegionSelection.isEqual(selectionSnapshot, uiState.activeSelection)
          )
            return;

          setGameData(getCurrentGameData(regionDataManager, uiState));
          // Force a repaint when game data was updated in-place and object identity did not change.
          setRenderToken((current) => current + 1);
        });
    } else if (activeView === RegionsInfoPanelView.Commuters) {
      const activeDatasetIdentifier = selectionSnapshot.datasetIdentifier;
      void Promise.all([
        regionDataManager.ensureExistsDataForDataset(
          activeDatasetIdentifier,
          RegionDataType.CommuterSummary,
          {
            forceBuild: false,
          },
        ),
        regionDataManager.ensureExistsDataForSelection(
          uiState,
          RegionDataType.CommuterDetails,
          { forceBuild: true },
        ),
      ]).then(() => {
        if (cancelled) return;
        if (
          !RegionSelection.isEqual(selectionSnapshot, uiState.activeSelection)
        )
          return;

        setGameData(getCurrentGameData(regionDataManager, uiState));
        // Force a repaint when game data was updated in-place and object identity did not change.
        setRenderToken((current) => current + 1);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [
    activeDatasetIdentifier,
    activeFeatureId,
    activeView,
    forceRefreshToken,
    regionDataManager,
    uiState,
  ]);

  const viewButtonConfigs: Map<string, SelectButtonConfig> = new Map();
  viewButtonConfigs.set(RegionsInfoPanelView.Statistics, {
    label: 'Summary',
    onSelect: () => setActiveView(RegionsInfoPanelView.Statistics),
    icon: createReactIconElement(createElement, FileChartColumnIcon, {
      size: 24,
    }),
  });
  viewButtonConfigs.set(RegionsInfoPanelView.Commuters, {
    label: 'Commuters',
    onSelect: () => setActiveView(RegionsInfoPanelView.Commuters),
    icon: createReactIconElement(createElement, TramFrontIcon, {
      size: 24,
    }),
  });

  let content: ReactNode;

  switch (activeView) {
    case RegionsInfoPanelView.Statistics:
      content = gameData
        ? renderStatisticsView(createElement, gameData, isCompactViewport)
        : createElement(
          'div',
          { className: 'text-xs text-muted-foreground' },
          'No game data set for info panel rendering',
        );
      break;
    case RegionsInfoPanelView.Commuters:
      content =
        gameData && gameData.commuterSummary && gameData.commuterDetails
          ? renderCommutersView(
            createElement,
            useState,
            gameData,
            commutersViewState,
            dispatchCommutersViewAction,
            resolveRegionName,
            isCompactViewport,
          )
          : createElement(
            'div',
            {
              className:
                'rounded-md border border-border/60 px-2 py-3 text-xs text-muted-foreground',
            },
            LOADING_VALUE_DISPLAY,
          );
      break;
    default:
      throw new Error(`Unsupported view ${activeView}`);
  }

  return createElement(
    'div',
    {
      id: REGIONS_INFO_PANEL_ID,
      className: [
        'pointer-events-auto',
        'backdrop-blur-sm bg-transparent',
        'border border-border/50',
        'h-auto rounded-lg',
        'text-sm shadow-lg overflow-hidden',
        'w-full flex flex-col min-h-0',
      ].join(' '),
      style: {
        maxHeight: infoPanelHeight,
        maxWidth: `calc(100vw - ${INFO_PANEL_VIEWPORT_WIDTH_OFFSET_PX}px)`,
      },
    },
    ReactPanelHeader(createElement, REGIONS_INFO_PANEL_TITLE, onClose),
    createElement(
      'div',
      { className: 'flex-1 min-h-0 overflow-hidden' },
      createElement(
        'div',
        {
          className: `p-2 flex flex-1 min-h-0 bg-primary-foreground/60 backdrop-blur-sm min-w-${INFO_PANEL_MIN_WIDTH} justify-center overflow-hidden`,
        },
        createElement(
          'div',
          {
            className: `flex flex-col ${isCompactViewport ? 'gap-1' : 'gap-2'} w-full min-w-${INFO_PANEL_MIN_WIDTH} min-h-0 flex-1`,
          },
          ReactSelectRow(
            createElement,
            viewButtonConfigs,
            activeView,
            `${REGIONS_INFO_PANEL_ID}-main-select`,
          ),
          createElement(
            'div',
            {
              className: `flex flex-col ${isCompactViewport ? 'gap-1' : 'gap-2'} min-h-0 flex-1 overflow-hidden`,
            },
            content,
          ),
        ),
      ),
    ),
  );
}

function createDefaultCommuterSortStates(): Map<CommuterDimension, SortState> {
  return new Map([
    [CommuterDimension.Region, { ...DEFAULT_SORT_STATE }],
    [CommuterDimension.CommuteHour, { ...DEFAULT_SORT_STATE }],
    [CommuterDimension.CommuteLength, { ...DEFAULT_SORT_STATE }],
  ]);
}

function createDefaultCommutersViewState(): CommutersViewState {
  return {
    dimension: CommuterDimension.Region,
    direction: CommuterDirection.Outbound,
    displayMode: CommuterDisplayMode.Table,
    sortStates: createDefaultCommuterSortStates(),
    tableOptions: {
      commuterCountDisplay: NumberDisplay.Absolute,
      modeShareDisplay: NumberDisplay.Absolute,
      expanded: false,
    },
    sankeyOptions: {
      labelsFollowFlowDirection: SANKEY_LABEL_FLOW_SYNC,
    },
  };
}

function commutersViewReducer(
  current: CommutersViewState,
  action: CommutersViewAction,
): CommutersViewState {
  switch (action.type) {
    case 'set_dimension':
      if (current.dimension === action.dimension) return current;
      return { ...current, dimension: action.dimension };
    case 'set_direction':
      if (current.direction === action.direction) return current;
      return { ...current, direction: action.direction };
    case 'set_display_mode':
      if (current.displayMode === action.displayMode) return current;
      return { ...current, displayMode: action.displayMode };
    case 'set_table_commuter_count_display':
      if (
        current.tableOptions.commuterCountDisplay ===
        action.commuterCountDisplay
      ) {
        return current;
      }
      return {
        ...current,
        tableOptions: {
          ...current.tableOptions,
          commuterCountDisplay: action.commuterCountDisplay,
        },
      };
    case 'set_table_mode_share_display':
      if (current.tableOptions.modeShareDisplay === action.modeShareDisplay) {
        return current;
      }
      return {
        ...current,
        tableOptions: {
          ...current.tableOptions,
          modeShareDisplay: action.modeShareDisplay,
        },
      };
    case 'toggle_table_expanded':
      return {
        ...current,
        tableOptions: {
          ...current.tableOptions,
          expanded: !current.tableOptions.expanded,
        },
      };
    case 'set_sankey_labels_follow_flow_direction':
      if (
        current.sankeyOptions.labelsFollowFlowDirection ===
        action.labelsFollowFlowDirection
      ) {
        return current;
      }
      return {
        ...current,
        sankeyOptions: {
          ...current.sankeyOptions,
          labelsFollowFlowDirection: action.labelsFollowFlowDirection,
        },
      };
    case 'set_sort_for_dimension': {
      const existingSort = current.sortStates.get(action.dimension);
      if (existingSort && SortState.equals(existingSort, action.sortState)) {
        return current;
      }
      const nextSortStates = new Map(current.sortStates);
      nextSortStates.set(action.dimension, action.sortState);
      return {
        ...current,
        sortStates: nextSortStates,
      };
    }
    default:
      return current;
  }
}

function getCurrentGameData(
  regionDataManager: RegionDataManager,
  uiState: Readonly<UIState>,
): RegionGameData | null {
  if (!uiState.isActive) return null;
  return regionDataManager.getGameData(uiState);
}
