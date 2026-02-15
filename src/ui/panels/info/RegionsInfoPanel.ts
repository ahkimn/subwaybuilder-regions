import {
  createElement,
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import {
  INFO_PANEL_MIN_WIDTH,
  REGIONS_INFO_PANEL_ID,
  REGIONS_INFO_PANEL_TITLE,
} from '../../../core/constants';
import type { RegionDataManager } from '../../../core/datasets/RegionDataManager';
import {
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
import { renderCommutersView } from './render-commuters';
import {
  renderStatisticsView,
} from './render-statistics';
import {
  CommuterDirection,
  type CommutersViewState,
  ModeLayout,
  NumberDisplay,
  RegionsInfoPanelView,
  SortDirection,
} from './types';

export type RegionsReactInfoPanelProps = {
  regionDataManager: RegionDataManager;
  uiState: Readonly<UIState>;
  onClose: () => void;
  forceRefreshToken: number;
};

function getCurrentGameData(
  regionDataManager: RegionDataManager,
  uiState: Readonly<UIState>,
): RegionGameData | null {
  if (!uiState.isActive) return null;
  return regionDataManager.getGameData(uiState);
}

export function RegionsReactInfoPanel({
  regionDataManager,
  uiState,
  onClose,
  forceRefreshToken,
}: RegionsReactInfoPanelProps): ReactNode {
  const [activeView, setActiveView] =
    useState<RegionsInfoPanelView>(RegionsInfoPanelView.Statistics);
  const [gameData, setGameData] = useState<RegionGameData | null>(() =>
    getCurrentGameData(regionDataManager, uiState),
  );
  const [commutersViewState, setCommutersViewState] =
    useState<CommutersViewState>({
      direction: CommuterDirection.Outbound,
      commuterCountDisplay: NumberDisplay.Absolute,
      modeShareDisplay: NumberDisplay.Absolute,
      modeShareLayout: ModeLayout.Transit,
      expanded: false,
      sortIndex: 1,
      previousSortIndex: 0,
      sortDirection: SortDirection.Desc,
      previousSortDirection: SortDirection.Asc,
    });
  const [, setRenderToken] = useState<number>(0);

  const activeDatasetIdentifier = uiState.activeSelection?.datasetIdentifier;
  const activeFeatureId = uiState.activeSelection?.featureId;

  useEffect(() => {
    setGameData(getCurrentGameData(regionDataManager, uiState));

    if (!uiState.isActive) {
      return;
    }

    const selectionSnapshot = uiState.activeSelection;
    let cancelled = false;
    if (activeView === RegionsInfoPanelView.Statistics) {
      void regionDataManager
        .ensureExistsData(uiState, 'infra', { forceBuild: false })
        .then(() => {
          if (cancelled) return;
          if (!RegionSelection.isEqual(selectionSnapshot, uiState.activeSelection))
            return;

          setGameData(getCurrentGameData(regionDataManager, uiState));
          // Force a repaint when game data was updated in-place and object identity did not change.
          setRenderToken((current) => current + 1);
        });
    } else if (activeView === RegionsInfoPanelView.Commuters) {
      void regionDataManager
        .ensureExistsData(uiState, 'commuter', { forceBuild: true })
        .then(() => {
          if (cancelled) return;
          if (!RegionSelection.isEqual(selectionSnapshot, uiState.activeSelection))
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


  const content: ReactNode = gameData
    ? activeView === RegionsInfoPanelView.Statistics
      ? renderStatisticsView(createElement, gameData)
      : gameData.commuterData
        ? renderCommutersView(
          createElement,
          useState,
          gameData,
          commutersViewState,
          setCommutersViewState,
        )
        : createElement(
          'div',
          {
            className:
              'rounded-md border border-border/60 px-2 py-3 text-xs text-muted-foreground',
          },
          'Loading commuter data...',
        )
    : createElement(
      'div',
      { className: 'text-xs text-muted-foreground' },
      'No game data set for info panel rendering',
    );

  return createElement(
    'div',
    {
      id: REGIONS_INFO_PANEL_ID,
      className: [
        'pointer-events-auto',
        'backdrop-blur-sm bg-transparent',
        'border border-border/50',
        'h-fit rounded-lg',
        'text-sm shadow-lg overflow-hidden',
        'w-full max-h-full flex flex-col min-h-0',
      ].join(' '),
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
            className: `flex flex-col gap-2 w-full min-w-${INFO_PANEL_MIN_WIDTH} min-h-0`,
          },
          ReactSelectRow(
            createElement,
            viewButtonConfigs,
            activeView,
            `${REGIONS_INFO_PANEL_ID}-main-select`,
          ),
          createElement('div', { className: 'flex flex-col gap-2 min-h-0' }, content),
        ),
      ),
    ),
  );
}
