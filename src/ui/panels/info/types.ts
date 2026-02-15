import { NumberDisplay, SortDirection } from '../types';

export const RegionsInfoPanelView = {
  Statistics: 'Statistics',
  Commuters: 'Commuters',
} as const;

export type RegionsInfoPanelView =
  (typeof RegionsInfoPanelView)[keyof typeof RegionsInfoPanelView];

export const CommuterDirection = {
  Outbound: 'Outbound',
  Inbound: 'Inbound',
} as const;

export type CommuterDirection =
  (typeof CommuterDirection)[keyof typeof CommuterDirection];

export const ModeLayout = {
  Transit: 'Transit',
  All: 'All',
} as const;

export type ModeLayout = (typeof ModeLayout)[keyof typeof ModeLayout];

export { NumberDisplay, SortDirection };

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
