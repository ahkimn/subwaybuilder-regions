import type React from 'react';
import type { createElement } from 'react';

import {
  COMPACT_SELECT_MENU_BUTTON_CLASS,
  COMPACT_SELECT_MENU_OPTION_CLASS,
  SelectMenu,
} from '../../elements/SelectMenu';
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
  const options = datasetIdentifiers.map((datasetIdentifier) => ({
    value: datasetIdentifier,
    label: getDatasetLabel(datasetIdentifier),
  }));

  return h(
    'div',
    { className: 'flex flex-col gap-1.5' },
    h(
      'div',
      {
        id: 'regions-overview-layer-select',
        className: 'w-full min-w-[220px] max-w-[360px]',
      },
      SelectMenu({
        h,
        value: selectedDatasetIdentifier,
        options,
        placeholder: 'Select dataset',
        onValueChange: onSelectDataset,
        buttonClassName: COMPACT_SELECT_MENU_BUTTON_CLASS,
        optionClassName: COMPACT_SELECT_MENU_OPTION_CLASS,
      }),
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
