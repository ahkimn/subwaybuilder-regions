import type { RegistryCacheEntry } from '@shared/dataset-index';

import type { RegionsStorage } from '@/core/storage/RegionsStorage';
import type { SystemPerformanceInfo } from '@/types';

import { DEFAULT_SORT_STATE, SortDirection, type SortState } from '../types';
import type {
  FetchCountryCode,
  FetchParameters,
  FetchValidationResult,
  LastCopiedFetchRequest,
} from './fetch-helpers';

export type PendingFlags = {
  updating: boolean;
  refreshingRegistry: boolean;
  clearingMissing: boolean;
  validatingFetchDatasets: boolean;
};

export type PendingFlagKey = keyof PendingFlags;

export type FetchState = {
  params: FetchParameters;
  isOpeningModsFolder: boolean;
  isCountryAutoResolved: boolean;
  lastCopiedRequest: LastCopiedFetchRequest | null;
  lastValidationResult: FetchValidationResult | null;
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
  | { type: 'set_pending_flag'; key: PendingFlagKey; value: boolean }
  | { type: 'set_fetch_params'; params: Partial<FetchParameters> }
  | {
      type: 'set_fetch_country_code';
      countryCode: FetchCountryCode | null;
      allowedDatasetIds: string[];
      isAutoResolved?: boolean;
    }
  | { type: 'toggle_fetch_dataset'; datasetId: string }
  | { type: 'set_is_opening_mods_folder'; value: boolean }
  | {
      type: 'set_last_copied_fetch_request';
      request: LastCopiedFetchRequest | null;
    }
  | {
      type: 'set_last_fetch_validation_result';
      result: FetchValidationResult | null;
    }
  | {
      type: 'set_system_performance_info';
      systemPerformanceInfo: SystemPerformanceInfo | null;
    };

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
    case 'set_pending_flag':
      return {
        ...state,
        pending: {
          ...state.pending,
          [action.key]: action.value,
        },
      };
    // Fetch-related actions
    case 'set_fetch_params':
      return {
        ...state,
        fetch: {
          ...state.fetch,
          params: {
            ...state.fetch.params,
            ...action.params,
          },
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
    case 'set_is_opening_mods_folder':
      return {
        ...state,
        fetch: {
          ...state.fetch,
          isOpeningModsFolder: action.value,
        },
      };
    case 'set_last_copied_fetch_request':
      return {
        ...state,
        fetch: {
          ...state.fetch,
          lastCopiedRequest: action.request,
        },
      };
    case 'set_last_fetch_validation_result':
      return {
        ...state,
        fetch: {
          ...state.fetch,
          lastValidationResult: action.result,
        },
      };
    case 'set_system_performance_info':
      return { ...state, systemPerformanceInfo: action.systemPerformanceInfo };
    default:
      return state;
  }
}

export const INITIAL_FETCH_STATE: FetchState = {
  params: {
    cityCode: '',
    countryCode: null,
    datasetIds: [],
    bbox: null,
  },
  isOpeningModsFolder: false,
  isCountryAutoResolved: false,
  lastCopiedRequest: null,
  lastValidationResult: null,
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
      validatingFetchDatasets: false,
    },
    fetch: INITIAL_FETCH_STATE,
    systemPerformanceInfo: null,
  };
}
