export type RegionsInfoPanelView = 'statistics' | 'commuters';
export type CommuterDirection = 'outbound' | 'inbound'
export type ModeDisplay = 'percent' | 'absolute';
export type ModeLayout = 'combined' | 'split';

export type CommutersViewState = {
  direction: CommuterDirection;
  modeDisplay: ModeDisplay;
  modeLayout: ModeLayout;
  expanded: boolean;
};