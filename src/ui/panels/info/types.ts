import type { NumberDisplay, SortDirection } from '../types';

export type RegionsInfoPanelView = 'statistics' | 'commuters';
export type CommuterDirection = 'outbound' | 'inbound'
export type ModeLayout = 'transit' | 'all';
export type { NumberDisplay, SortDirection } from '../types';

export type CommutersViewState = {
  direction: CommuterDirection;
  commuterCountDisplay: NumberDisplay;
  modeShareDisplay: NumberDisplay;
  modeShareLayout: ModeLayout;
  expanded: boolean;
  sortIndex: number;
  previousSortIndex: number;
  sortDirection: SortDirection;
  previousSortDirection: SortDirection;
};
