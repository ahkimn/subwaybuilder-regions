import type { RegionGameData, RegionSelection } from '../../../core/types';
import type { SortDirection } from '../types';

export const RegionsOverviewTab = {
  Overview: 'Overview',
  CommuterFlows: 'CommuterFlows',
  Ridership: 'Ridership',
} as const;

export type RegionsOverviewTab =
  (typeof RegionsOverviewTab)[keyof typeof RegionsOverviewTab];

export type RegionsOverviewSortState = {
  sortIndex: number;
  previousSortIndex: number;
  sortDirection: SortDirection;
  previousSortDirection: SortDirection;
};

export type RegionsOverviewPanelState = {
  selectedDatasetIdentifier: string;
  searchTerm: string;
  activeTab: RegionsOverviewTab;
  sortState: RegionsOverviewSortState;
};

export type RegionsOverviewRow = {
  selection: RegionSelection;
  gameData: RegionGameData;
};
