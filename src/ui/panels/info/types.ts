import type { ModeShare } from '../../../core/types';
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
  displayMode: CommuterDisplayMode;
  sortStates: Map<CommuterDimension, SortState>;
  tableOptions: TableDisplayOptions;
  sankeyOptions: SankeyDisplayOptions;
};

export type TableDisplayOptions = {
  commuterCountDisplay: NumberDisplay;
  modeShareDisplay: NumberDisplay;
  expanded: boolean;
};

export type SankeyDisplayOptions = {
  labelsFollowFlowDirection: boolean;
};

export type SortState = {
  sortIndex: number;
  sortDirection: SortDirection;
  previousSortIndex: number;
  previousSortDirection: SortDirection;
};

export const SortState = {
  equals(a: SortState, b: SortState): boolean {
    return (
      a.sortIndex === b.sortIndex &&
      a.sortDirection === b.sortDirection &&
      a.previousSortIndex === b.previousSortIndex &&
      a.previousSortDirection === b.previousSortDirection
    );
  },
};

export type CommuterBreakdownData = {
  modeShareByBreakdownUnit: Map<string | number, ModeShare>;
  resolveBreakdownUnitName: (unitId: string | number) => string;
  sourceModeShareByBreakdownUnit?: Map<
    string | number,
    Map<string | number, ModeShare>
  >;
};

export type CommutersViewAction =
  | { type: 'set_dimension'; dimension: CommuterDimension }
  | { type: 'set_direction'; direction: CommuterDirection }
  | { type: 'set_display_mode'; displayMode: CommuterDisplayMode }
  | {
      type: 'set_table_commuter_count_display';
      commuterCountDisplay: NumberDisplay;
    }
  | { type: 'set_table_mode_share_display'; modeShareDisplay: NumberDisplay }
  | { type: 'toggle_table_expanded' }
  | {
      type: 'set_sankey_labels_follow_flow_direction';
      labelsFollowFlowDirection: boolean;
    }
  | {
      type: 'set_sort_for_dimension';
      dimension: CommuterDimension;
      sortState: SortState;
    };
