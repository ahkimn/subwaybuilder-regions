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
  type ReactSelectButtonConfig,
  ReactSelectRow,
} from '../../elements/SelectRow';
import {
  createReactIconElement,
  FileChartColumnIcon,
  TramFrontIcon,
} from '../../elements/utils/get-icon';
import {
  renderReactPlaceholderCommutersView,
  renderReactStatisticsView,
} from './render-react';
import type { RegionsInfoPanelView } from './types';

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
    useState<RegionsInfoPanelView>('statistics');
  const [gameData, setGameData] = useState<RegionGameData | null>(() =>
    getCurrentGameData(regionDataManager, uiState),
  );
  const [, setRenderToken] = useState<number>(0);

  const activeDatasetIdentifier = uiState.activeSelection?.datasetIdentifier;
  const activeFeatureId = uiState.activeSelection?.featureId;

  useEffect(() => {
    setGameData(getCurrentGameData(regionDataManager, uiState));

    if (!uiState.isActive || activeView !== 'statistics') {
      return;
    }

    const selectionSnapshot = uiState.activeSelection;
    let cancelled = false;

    void regionDataManager
      .ensureExistsData(uiState, 'infra', { forceBuild: false })
      .then(() => {
        if (cancelled) return;
        if (activeView !== 'statistics') return;
        if (!RegionSelection.isEqual(selectionSnapshot, uiState.activeSelection))
          return;

        setGameData(getCurrentGameData(regionDataManager, uiState));
        // Force a repaint when game data was updated in-place and object identity did not change.
        setRenderToken((current) => current + 1);
      });

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

  const tabConfigs: Map<string, ReactSelectButtonConfig> = new Map();
  tabConfigs.set('statistics', {
    label: 'Summary',
    onSelect: () => setActiveView('statistics'),
    icon: createReactIconElement(createElement, FileChartColumnIcon, {
      size: 24,
    }),
  });
  tabConfigs.set('commuters', {
    label: 'Commuters',
    onSelect: () => setActiveView('commuters'),
    icon: createReactIconElement(createElement, TramFrontIcon, {
      size: 24,
    }),
  });

  const content: ReactNode = gameData
    ? activeView === 'statistics'
      ? renderReactStatisticsView(createElement, gameData)
      : renderReactPlaceholderCommutersView(createElement, gameData)
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
            tabConfigs,
            activeView,
            `${REGIONS_INFO_PANEL_ID}-main-select`,
          ),
          createElement('div', { className: 'flex flex-col gap-2 min-h-0' }, content),
        ),
      ),
    ),
  );
}
