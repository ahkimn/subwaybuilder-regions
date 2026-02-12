import type { RegionGameData, RegionSelection } from '../../../core/types';
import type { SortDirection } from '../types';

export type RegionsOverviewTab = 'overview' | 'commuter-flows' | 'ridership';

export type RegionsOverviewSortState = {
  sortIndex: number;
  previousSortIndex: number;
  sortDirection: SortDirection;
  previousSortDirection: SortDirection;
};

export type RegionsOverviewRow = {
  selection: RegionSelection;
  gameData: RegionGameData;
};
