import type { RegionGameData, RegionSelection } from '@/core/domain';

import type { SortState } from '../types';

export const RegionsOverviewTab = {
  Overview: 'Overview',
  HistoricalData: 'HistoricalData',
  Ridership: 'Ridership',
} as const;

export type RegionsOverviewTab =
  (typeof RegionsOverviewTab)[keyof typeof RegionsOverviewTab];

export type RegionsOverviewPanelState = {
  selectedDatasetIdentifier: string;
  searchTerm: string;
  activeTab: RegionsOverviewTab;
  sortState: SortState;
};

export type RegionsOverviewRow = {
  selection: RegionSelection;
  gameData: RegionGameData;
};
