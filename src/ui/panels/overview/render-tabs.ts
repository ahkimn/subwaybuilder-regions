import type React from 'react';
import type { createElement } from 'react';

import type { SelectButtonConfig } from '../../elements/SelectRow';
import { ReactSelectRow } from '../../elements/SelectRow';
import type { RegionsOverviewTab } from './types';
import { RegionsOverviewTab as RegionsOverviewTabs } from './types';

export function renderLayerSelectorRow(
  h: typeof createElement,
  datasetIdentifiers: string[],
  selectedDatasetIdentifier: string,
  getDatasetLabel: (datasetIdentifier: string) => string,
  onSelectDataset: (datasetIdentifier: string) => void,
): React.ReactNode {
  const buttonConfigs: Map<string, SelectButtonConfig> = new Map();
  datasetIdentifiers.forEach((datasetIdentifier) => {
    buttonConfigs.set(datasetIdentifier, {
      label: getDatasetLabel(datasetIdentifier),
      onSelect: () => onSelectDataset(datasetIdentifier),
    });
  });

  return h(
    'div',
    { className: 'flex flex-col gap-1.5' },
    ReactSelectRow(
      h,
      buttonConfigs,
      selectedDatasetIdentifier,
      'regions-overview-layer-select',
    ),
  );
}

export function renderOverviewTabs(
  h: typeof createElement,
  activeTab: RegionsOverviewTab,
  onSetTab: (tab: RegionsOverviewTab) => void,
): React.ReactNode {
  const tabOptions: Map<string, SelectButtonConfig> = new Map();
  tabOptions.set(RegionsOverviewTabs.Overview, {
    label: 'Overview',
    onSelect: () => onSetTab(RegionsOverviewTabs.Overview),
  });
  tabOptions.set(RegionsOverviewTabs.HistoricalData, {
    label: 'Historical Data (WIP)',
    onSelect: () => onSetTab(RegionsOverviewTabs.HistoricalData),
  });
  tabOptions.set(RegionsOverviewTabs.Ridership, {
    label: 'Ridership (WIP)',
    onSelect: () => onSetTab(RegionsOverviewTabs.Ridership),
  });

  return ReactSelectRow(
    h,
    tabOptions,
    activeTab,
    'regions-overview-tab-select',
    true,
  );
}
