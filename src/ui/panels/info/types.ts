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

export const CommuterDimension = {
  Region: 'Region',
  CommuteHour: 'Hour',
  CommuteLength: 'Length',
} as const;

export type CommuterDimension =
  (typeof CommuterDimension)[keyof typeof CommuterDimension];

export const ModeLayout = {
  Transit: 'Transit',
  All: 'All',
} as const;

export type ModeLayout = (typeof ModeLayout)[keyof typeof ModeLayout];

export const CommuterDisplayMode = {
  Table: 'Table',
  Sankey: 'Sankey',
  BarChart: 'Bar Chart',
} as const;

export type CommuterDisplayMode =
  (typeof CommuterDisplayMode)[keyof typeof CommuterDisplayMode];

export { NumberDisplay, SortDirection };

export type CommutersViewState = {
  dimension: CommuterDimension;
  direction: CommuterDirection;
  commuterCountDisplay: NumberDisplay;
  modeShareDisplay: NumberDisplay;
  graphDisplay: NumberDisplay;
  modeShareLayout: ModeLayout;
  displayMode: CommuterDisplayMode;
  expanded: boolean;
  sortIndex: number;
  previousSortIndex: number;
  sortDirection: SortDirection;
  previousSortDirection: SortDirection;
};
