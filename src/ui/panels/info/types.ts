export type RegionsInfoPanelView = 'statistics' | 'commuters';
export type CommuterDirection = 'outbound' | 'inbound'
export type NumberDisplay = 'absolute' | 'percentage';
export type ModeLayout = 'transit' | 'all';
export type SortDirection = 'asc' | 'desc';

export type CommutersViewState = {
  direction: CommuterDirection;
  commuterCountDisplay: NumberDisplay;
  modeShareDisplay: NumberDisplay;
  modeShareLayout: ModeLayout;
  expanded: boolean;
  sortIndex: number;
  sortDirection: SortDirection;
};
