import type { RegistryCacheEntry } from '../../../../shared/dataset-index';
import type { RegionsStorage } from '../../../core/storage/RegionsStorage';
import type { SystemPerformanceInfo } from '../../../types';
import { DEFAULT_SORT_STATE, SortDirection, type SortState } from '../types';
import type { FetchCountryCode, FetchParameters } from './fetch-helpers';

type PendingFlags = {
  updating: boolean;
  refreshingRegistry: boolean;
  clearingMissing: boolean;
};

export type FetchState = {
  params: FetchParameters;
  command: string;
  errors: string[];
  isCopying: boolean;
  isOpeningModsFolder: boolean;
  isCountryAutoResolved: boolean;
};

export type RegionsSettingsState = {
  isOpen: boolean;
  settings: ReturnType<RegionsStorage['getSettings']>;
  cachedRegistryEntries: RegistryCacheEntry[];
  searchTerm: string;
  sortState: SortState;
  registryRevision: number;
  pending: PendingFlags;
  fetch: FetchState;
  systemPerformanceInfo: SystemPerformanceInfo | null;
  error: string | null;
};

/**
 *
 */
export type RegionsSettingsAction =
  | { type: 'open_overlay' }
  | { type: 'close_overlay' }
  | { type: 'set_search_term'; searchTerm: string }
  | { type: 'set_sort_state'; sortState: SortState }
  | {
      type: 'settings_loaded';
      settings: ReturnType<RegionsStorage['getSettings']>;
    }
  | {
      type: 'settings_updated';
      settings: ReturnType<RegionsStorage['getSettings']>;
    }
  | { type: 'registry_entries_loaded'; entries: RegistryCacheEntry[] }
  | { type: 'registry_revision_bumped' }
  | { type: 'update_settings_started' }
  | { type: 'update_settings_finished' }
  | { type: 'refresh_registry_started' }
  | { type: 'refresh_registry_finished' }
  | { type: 'clear_missing_started' }
  | { type: 'clear_missing_finished' }
  | { type: 'set_fetch_city_code'; cityCode: string }
  | {
      type: 'set_fetch_country_code';
      countryCode: FetchCountryCode;
      allowedDatasetIds: string[];
      isAutoResolved?: boolean;
    }
  | { type: 'toggle_fetch_dataset'; datasetId: string }
  | {
      type: 'set_fetch_bbox_fields';
      west: string;
      south: string;
      east: string;
      north: string;
    }
  | { type: 'set_fetch_command'; command: string }
  | { type: 'set_fetch_errors'; errors: string[] }
  | { type: 'copy_fetch_command_started' }
  | { type: 'copy_fetch_command_finished' }
  | { type: 'open_mods_folder_started' }
  | { type: 'open_mods_folder_finished' }
  | {
      type: 'set_system_performance_info';
      systemPerformanceInfo: SystemPerformanceInfo | null;
    }
  | { type: 'operation_failed'; message: string };

export function regionsSettingsReducer(
  state: RegionsSettingsState,
  action: RegionsSettingsAction,
): RegionsSettingsState {
  switch (action.type) {
    // UI actions
    case 'open_overlay':
      return { ...state, isOpen: true };
    case 'close_overlay':
      return { ...state, isOpen: false };
    case 'set_search_term':
      return { ...state, searchTerm: action.searchTerm };
    case 'set_sort_state':
      return { ...state, sortState: action.sortState };

    // Store/registry sync actions
    case 'settings_loaded':
    case 'settings_updated':
      return { ...state, settings: action.settings };
    case 'registry_entries_loaded':
      return { ...state, cachedRegistryEntries: action.entries };
    case 'registry_revision_bumped':
      return { ...state, registryRevision: state.registryRevision + 1 };

    // Async lifecycle actions
    case 'update_settings_started':
      return {
        ...state,
        pending: { ...state.pending, updating: true },
        error: null,
      };
    case 'update_settings_finished':
      return {
        ...state,
        pending: { ...state.pending, updating: false },
      };
    case 'refresh_registry_started':
      return {
        ...state,
        pending: { ...state.pending, refreshingRegistry: true },
        error: null,
      };
    case 'refresh_registry_finished':
      return {
        ...state,
        pending: { ...state.pending, refreshingRegistry: false },
      };
    case 'clear_missing_started':
      return {
        ...state,
        pending: { ...state.pending, clearingMissing: true },
        error: null,
      };
    case 'clear_missing_finished':
      return {
        ...state,
        pending: { ...state.pending, clearingMissing: false },
      };
    // Fetch-related actions
    case 'set_fetch_city_code':
      return {
        ...state,
        fetch: {
          ...state.fetch,
          params: {
            ...state.fetch.params,
            cityCode: action.cityCode,
            countryCode: '',
            datasetIds: [],
            west: '',
            south: '',
            east: '',
            north: '',
          },
          isCountryAutoResolved: false,
        },
      };
    case 'set_fetch_country_code':
      return {
        ...state,
        fetch: {
          ...state.fetch,
          params: {
            ...state.fetch.params,
            countryCode: action.countryCode,
            datasetIds: state.fetch.params.datasetIds.filter((datasetId) =>
              action.allowedDatasetIds.includes(datasetId),
            ),
          },
          isCountryAutoResolved:
            action.isAutoResolved ?? state.fetch.isCountryAutoResolved,
        },
      };
    case 'toggle_fetch_dataset': {
      const exists = state.fetch.params.datasetIds.includes(action.datasetId);
      const nextDatasetIds = exists
        ? state.fetch.params.datasetIds.filter(
            (datasetId) => datasetId !== action.datasetId,
          )
        : [...state.fetch.params.datasetIds, action.datasetId];

      return {
        ...state,
        fetch: {
          ...state.fetch,
          params: {
            ...state.fetch.params,
            datasetIds: nextDatasetIds,
          },
        },
      };
    }
    case 'set_fetch_bbox_fields':
      return {
        ...state,
        fetch: {
          ...state.fetch,
          params: {
            ...state.fetch.params,
            west: action.west,
            south: action.south,
            east: action.east,
            north: action.north,
          },
        },
      };
    case 'set_fetch_command':
      if (state.fetch.command === action.command) {
        return state;
      }
      return {
        ...state,
        fetch: {
          ...state.fetch,
          command: action.command,
        },
      };
    case 'set_fetch_errors':
      if (isStringArrayEqual(state.fetch.errors, action.errors)) {
        return state;
      }
      return {
        ...state,
        fetch: {
          ...state.fetch,
          errors: action.errors,
        },
      };
    case 'copy_fetch_command_started':
      return {
        ...state,
        fetch: {
          ...state.fetch,
          isCopying: true,
        },
      };
    case 'copy_fetch_command_finished':
      return {
        ...state,
        fetch: {
          ...state.fetch,
          isCopying: false,
        },
      };
    // Mods folder exposure
    case 'open_mods_folder_started':
      return {
        ...state,
        fetch: {
          ...state.fetch,
          isOpeningModsFolder: true,
        },
      };
    case 'open_mods_folder_finished':
      return {
        ...state,
        fetch: {
          ...state.fetch,
          isOpeningModsFolder: false,
        },
      };
    case 'set_system_performance_info':
      return { ...state, systemPerformanceInfo: action.systemPerformanceInfo };
    case 'operation_failed':
      return { ...state, error: action.message };
    default:
      return state;
  }
}

export const INITIAL_FETCH_STATE: FetchState = {
  params: {
    cityCode: '',
    countryCode: '',
    datasetIds: [],
    west: '',
    south: '',
    east: '',
    north: '',
  },
  command: '',
  errors: [],
  isCopying: false,
  isOpeningModsFolder: false,
  isCountryAutoResolved: false,
};

export function createInitialSettingsState(
  storage: RegionsStorage,
): RegionsSettingsState {
  return {
    isOpen: false,
    settings: storage.getSettings(),
    cachedRegistryEntries: [],
    searchTerm: '',
    sortState: {
      ...DEFAULT_SORT_STATE,
      sortDirection: SortDirection.Asc,
    },
    registryRevision: 0,
    pending: {
      updating: false,
      refreshingRegistry: false,
      clearingMissing: false,
    },
    fetch: INITIAL_FETCH_STATE,
    systemPerformanceInfo: null,
    error: null,
  };
}

function isStringArrayEqual(a: string[], b: string[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}
