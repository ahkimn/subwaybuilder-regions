import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveCountryDatasets } from '@shared/datasets/catalog';

import {
  buildFetchErrors,
  deriveFetchActionAvailability,
  type FetchBBox,
  type FetchCountryCode,
  type FetchParameters,
  formatFetchCommand,
  hasFetchableDatasetsForCity,
  type LastCopiedFetchRequest,
  resolveCityCountryCode,
} from '@/ui/panels/settings/fetch-helpers';
import {
  type FetchState,
  INITIAL_FETCH_STATE,
  type RegionsSettingsAction,
  regionsSettingsReducer,
  type RegionsSettingsState,
} from '@/ui/panels/settings/RegionsSettingsState';
import type { City } from '@/types/cities';
import { SortDirection } from '@/ui/panels/types';

type DerivedFetchUi = {
  errors: string[];
  command: string;
  canCopyCommand: boolean;
  canOpenModsFolder: boolean;
  canValidateDatasets: boolean;
};

const DEFAULT_BOS_BBOX: FetchBBox = {
  west: '-71.6694',
  south: '41.5557',
  east: '-71.1263',
  north: '42.0151',
};

const FETCH_CITY_FIXTURES: City[] = [
  {
    code: 'BOS',
    name: 'Boston',
    country: 'US',
    description: 'Fixture city',
    mapImageUrl: '',
    population: 1000,
    initialViewState: {
      zoom: 11,
      latitude: 42.36,
      longitude: -71.05,
      bearing: 0,
    },
  },
  {
    code: 'HKD',
    name: 'Hakodate',
    country: 'JP',
    description: 'JP fixture city',
    mapImageUrl: '',
    population: 1000,
    initialViewState: {
      zoom: 11,
      latitude: 41.77,
      longitude: 140.73,
      bearing: 0,
    },
  },
];

function createFetchSnapshot(
  request: FetchParameters,
  copiedAt: number = Date.now(),
): LastCopiedFetchRequest {
  assert.ok(request.countryCode, 'Expected countryCode for snapshot');
  assert.ok(request.bbox, 'Expected bbox for snapshot');
  return {
    cityCode: request.cityCode,
    countryCode: request.countryCode,
    datasetIds: [...request.datasetIds],
    bbox: { ...request.bbox },
    copiedAt,
  };
}

function createHappyFetchState(
  overrides?: Partial<FetchState>,
  requestOverrides?: Partial<FetchParameters>,
): FetchState {
  const usDataset = resolveCountryDatasets('US', { onlineOnly: true })[0];
  assert.ok(usDataset, 'Expected at least one US dataset');

  const baseRequest: FetchParameters = {
    cityCode: 'BOS',
    countryCode: 'US',
    datasetIds: [usDataset.datasetId],
    bbox: DEFAULT_BOS_BBOX,
  };

  return {
    params: {
      ...baseRequest,
      ...requestOverrides,
    },
    isOpeningModsFolder: false,
    isCountryAutoResolved: true,
    lastCopiedRequest: null,
    lastOpenedModsFolderRequest: null,
    lastValidationResult: null,
    ...overrides,
  };
}

function deriveFetchUi(fetchState: FetchState): DerivedFetchUi {
  const errors = buildFetchErrors({
    hasCity: Boolean(fetchState.params.cityCode),
    hasCountry: fetchState.params.countryCode !== null,
    hasDatasets: fetchState.params.datasetIds.length > 0,
    hasBBox: fetchState.params.bbox !== null,
  });

  const command =
    errors.length > 0
      ? ''
      : formatFetchCommand({
          platform: 'win32',
          params: fetchState.params,
          relativeModPath: 'regions',
          outPath: '.\\regions\\data',
        });

  const availability = deriveFetchActionAvailability({
    command,
    request: fetchState.params,
    lastCopiedRequest: fetchState.lastCopiedRequest,
  });

  return {
    errors,
    command,
    ...availability,
  };
}

function buildStateWithFetch(fetch: FetchState): RegionsSettingsState {
  return {
    isOpen: false,
    settings: { showUnpopulatedRegions: false },
    cachedRegistryEntries: [],
    searchTerm: '',
    sortState: {
      sortIndex: 0,
      sortDirection: SortDirection.Asc,
      previousSortIndex: 0,
      previousSortDirection: SortDirection.Asc,
    },
    pending: {
      updating: false,
      refreshingRegistry: false,
      clearingMissing: false,
      validatingFetchDatasets: false,
    },
    fetch,
    systemPerformanceInfo: null,
  };
}

function reduceFetchState(
  fetch: FetchState,
  action: RegionsSettingsAction,
): FetchState {
  return regionsSettingsReducer(buildStateWithFetch(fetch), action).fetch;
}

describe('settings fetch datasets action gating (state/contract)', () => {
  it('filters fetch city options to countries with online datasets and scanned city data', () => {
    assert.equal(resolveCityCountryCode(FETCH_CITY_FIXTURES[0]), 'US');
    assert.equal(resolveCityCountryCode(FETCH_CITY_FIXTURES[1]), 'JP');
    assert.equal(hasFetchableDatasetsForCity(FETCH_CITY_FIXTURES[0]), true);
    assert.equal(hasFetchableDatasetsForCity(FETCH_CITY_FIXTURES[1]), false);

    const availableCityCodes = new Set(['BOS', 'HKD']);
    const filtered = FETCH_CITY_FIXTURES.filter((city) => {
      return (
        hasFetchableDatasetsForCity(city) && availableCityCodes.has(city.code)
      );
    });
    assert.deepEqual(
      filtered.map((city) => city.code),
      ['BOS'],
    );

    const filteredWithoutScannedData = FETCH_CITY_FIXTURES.filter((city) => {
      return hasFetchableDatasetsForCity(city) && city.code === 'HKD';
    });
    assert.deepEqual(filteredWithoutScannedData, []);
  });

  it('gates actions in order: copy -> validate while keeping open mods folder optional', () => {
    let fetchState = createHappyFetchState();

    const initial = deriveFetchUi(fetchState);
    assert.equal(initial.canCopyCommand, true);
    assert.equal(initial.canOpenModsFolder, false);
    assert.equal(initial.canValidateDatasets, false);

    const copiedSnapshot = createFetchSnapshot(fetchState.params);
    fetchState = {
      ...fetchState,
      lastCopiedRequest: copiedSnapshot,
      lastValidationResult: null,
    };

    const afterCopy = deriveFetchUi(fetchState);
    assert.equal(afterCopy.canCopyCommand, true);
    assert.equal(afterCopy.canOpenModsFolder, true);
    assert.equal(afterCopy.canValidateDatasets, true);

    fetchState = {
      ...fetchState,
      lastValidationResult: {
        cityCode: fetchState.params.cityCode,
        foundIds: [...fetchState.params.datasetIds],
        missingIds: [],
        updatedEntries: [],
        validatedAt: Date.now(),
      },
    };

    assert.equal(fetchState.lastValidationResult?.missingIds.length, 0);
  });

  it('resets open/validate progression when request inputs change', () => {
    const usDatasets = resolveCountryDatasets('US', { onlineOnly: true });
    const gbDatasets = resolveCountryDatasets('GB', { onlineOnly: true });
    assert.ok(usDatasets.length > 1, 'Expected multiple US datasets');
    assert.ok(gbDatasets.length > 0, 'Expected GB datasets');

    const baseState = createHappyFetchState(
      {
        isCountryAutoResolved: false,
      },
      {
        cityCode: 'PVD',
        countryCode: 'US',
        datasetIds: [usDatasets[0].datasetId],
      },
    );
    const progressedState: FetchState = {
      ...baseState,
      lastCopiedRequest: createFetchSnapshot(baseState.params, 1),
      lastOpenedModsFolderRequest: createFetchSnapshot(baseState.params, 2),
      lastValidationResult: {
        cityCode: 'PVD',
        foundIds: [...baseState.params.datasetIds],
        missingIds: [],
        updatedEntries: [],
        validatedAt: Date.now(),
      },
    };

    const mutations: Array<{
      name: string;
      mutate: (state: FetchState) => FetchState;
      expectedCanCopyCommand: boolean;
    }> = [
      {
        name: 'city',
        mutate: (state) =>
          reduceFetchState(state, {
            type: 'set_fetch_params',
            params: {
              cityCode: 'BOS',
              countryCode: 'US',
              datasetIds: [usDatasets[0].datasetId],
              bbox: DEFAULT_BOS_BBOX,
            },
          }),
        expectedCanCopyCommand: true,
      },
      {
        name: 'countryCode',
        mutate: (state) =>
          reduceFetchState(state, {
            type: 'set_fetch_country_code',
            countryCode: 'GB' as FetchCountryCode,
            allowedDatasetIds: gbDatasets.map((dataset) => dataset.datasetId),
            isAutoResolved: false,
          }),
        expectedCanCopyCommand: false,
      },
      {
        name: 'datasetIds',
        mutate: (state) =>
          reduceFetchState(state, {
            type: 'toggle_fetch_dataset',
            datasetId: usDatasets[1].datasetId,
          }),
        expectedCanCopyCommand: true,
      },
    ];

    for (const mutation of mutations) {
      const mutated = mutation.mutate(progressedState);
      const derived = deriveFetchUi(mutated);

      assert.equal(
        mutated.lastCopiedRequest,
        null,
        `Expected copied snapshot reset after ${mutation.name} mutation`,
      );
      assert.equal(
        mutated.lastOpenedModsFolderRequest,
        null,
        `Expected open-folder snapshot reset after ${mutation.name} mutation`,
      );
      assert.equal(
        mutated.lastValidationResult,
        null,
        `Expected validation result reset after ${mutation.name} mutation`,
      );
      assert.equal(
        derived.canOpenModsFolder,
        false,
        `Expected open button re-gated after ${mutation.name} mutation`,
      );
      assert.equal(
        derived.canValidateDatasets,
        false,
        `Expected validate button re-gated after ${mutation.name} mutation`,
      );
      assert.equal(
        derived.canCopyCommand,
        mutation.expectedCanCopyCommand,
        `Unexpected copy availability after ${mutation.name} mutation`,
      );
    }
  });

  it('clears fetch state when overlay closes', () => {
    const dirtyFetchState: FetchState = {
      ...createHappyFetchState(),
      isOpeningModsFolder: true,
      isCountryAutoResolved: true,
      lastCopiedRequest: createFetchSnapshot(createHappyFetchState().params, 1),
      lastOpenedModsFolderRequest: createFetchSnapshot(
        createHappyFetchState().params,
        2,
      ),
      lastValidationResult: {
        cityCode: 'BOS',
        foundIds: ['counties'],
        missingIds: [],
        updatedEntries: [],
        validatedAt: Date.now(),
      },
    };

    const nextState = regionsSettingsReducer(
      { ...buildStateWithFetch(dirtyFetchState), isOpen: true },
      { type: 'close_overlay' },
    );

    assert.equal(nextState.isOpen, false);
    assert.deepEqual(nextState.fetch, INITIAL_FETCH_STATE);
  });
});
