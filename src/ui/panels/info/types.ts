export type RegionsInfoPanelView = 'statistics' | 'commuters';
export type CommuterDirection = 'outbound' | 'inbound'
export type ModeDisplay = 'absolute' | 'percentage';
export type ModeLayout = 'transit' | 'all';

export type CommutersViewState = {
  direction: CommuterDirection;
  modeDisplay: ModeDisplay;
  modeLayout: ModeLayout;
  expanded: boolean;
};