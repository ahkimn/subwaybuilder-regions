import { SANKEY_LABEL_FLOW_SYNC } from '@/core/constants';

import {
  DEFAULT_SORT_STATE,
  NumberDisplay,
  SortDirection,
  SortState,
} from '../types';
import {
  CommuterDimension,
  CommuterDirection,
  CommuterDisplayMode,
  type CommutersViewAction,
  type CommutersViewState,
} from './types';

function createDefaultCommuterSortStates(): Map<CommuterDimension, SortState> {
  return new Map([
    // By default sort regions by name ascending (alphabetical order); other dimensions should be based on natural number order (descending)
    [
      CommuterDimension.Region,
      { ...DEFAULT_SORT_STATE, sortDirection: SortDirection.Asc },
    ],
    [CommuterDimension.CommuteHour, { ...DEFAULT_SORT_STATE }],
    [CommuterDimension.CommuteLength, { ...DEFAULT_SORT_STATE }],
  ]);
}

export function createDefaultCommutersViewState(): CommutersViewState {
  return {
    dimension: CommuterDimension.Region,
    direction: CommuterDirection.Outbound,
    displayMode: CommuterDisplayMode.Table,
    sortStates: createDefaultCommuterSortStates(),
    tableOptions: {
      commuterCountDisplay: NumberDisplay.Absolute,
      modeShareDisplay: NumberDisplay.Absolute,
      expanded: false,
    },
    sankeyOptions: {
      labelsFollowFlowDirection: SANKEY_LABEL_FLOW_SYNC,
    },
  };
}

function setIfChanged<T, K extends keyof T>(state: T, key: K, value: T[K]): T {
  if (state[key] === value) return state;
  return { ...state, [key]: value };
}

function setTableOptionIfChanged<
  K extends keyof CommutersViewState['tableOptions'],
>(
  state: CommutersViewState,
  key: K,
  value: CommutersViewState['tableOptions'][K],
): CommutersViewState {
  if (state.tableOptions[key] === value) return state;
  return {
    ...state,
    tableOptions: {
      ...state.tableOptions,
      [key]: value,
    },
  };
}

function setSankeyOptionIfChanged<
  K extends keyof CommutersViewState['sankeyOptions'],
>(
  state: CommutersViewState,
  key: K,
  value: CommutersViewState['sankeyOptions'][K],
): CommutersViewState {
  if (state.sankeyOptions[key] === value) return state;
  return {
    ...state,
    sankeyOptions: {
      ...state.sankeyOptions,
      [key]: value,
    },
  };
}

export function commutersViewReducer(
  current: CommutersViewState,
  action: CommutersViewAction,
): CommutersViewState {
  switch (action.type) {
    case 'set_dimension':
      return setIfChanged(current, 'dimension', action.dimension);
    case 'set_direction':
      return setIfChanged(current, 'direction', action.direction);
    case 'set_display_mode':
      return setIfChanged(current, 'displayMode', action.displayMode);
    case 'set_table_commuter_count_display':
      return setTableOptionIfChanged(
        current,
        'commuterCountDisplay',
        action.commuterCountDisplay,
      );
    case 'set_table_mode_share_display':
      return setTableOptionIfChanged(
        current,
        'modeShareDisplay',
        action.modeShareDisplay,
      );
    case 'toggle_table_expanded':
      return {
        ...current,
        tableOptions: {
          ...current.tableOptions,
          expanded: !current.tableOptions.expanded,
        },
      };
    case 'set_sankey_labels_follow_flow_direction':
      return setSankeyOptionIfChanged(
        current,
        'labelsFollowFlowDirection',
        action.labelsFollowFlowDirection,
      );
    case 'set_sort_for_dimension': {
      const existingSort = current.sortStates.get(action.dimension);
      if (existingSort && SortState.equals(existingSort, action.sortState)) {
        return current;
      }
      const nextSortStates = new Map(current.sortStates);
      nextSortStates.set(action.dimension, action.sortState);
      return {
        ...current,
        sortStates: nextSortStates,
      };
    }
    default:
      return current;
  }
}
