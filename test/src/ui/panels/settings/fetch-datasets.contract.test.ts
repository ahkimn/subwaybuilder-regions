import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveCountryDatasets } from '../../../../../shared/datasets/catalog';
import type { City } from '../../../../../src/types/cities';
import {
  buildFetchErrors,
  type FetchCountryCode,
  formatFetchCommand,
  resolveCityCountryCode,
} from '../../../../../src/ui/panels/settings/fetch-helpers';
import {
  type FetchState,
  INITIAL_FETCH_STATE,
} from '../../../../../src/ui/panels/settings/RegionsSettingsState';

type DerivedFetchUi = {
  errors: string[];
  command: string;
  canCopyCommand: boolean;
  canValidateDatasets: boolean;
};

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

  return {
    errors,
    command,
    canCopyCommand: command.length > 0,
    canValidateDatasets: fetchState.lastCopiedRequest !== null,
  };
}

// Simulate selecting a city, which may also auto-resolve the country and filter datasets based on the city-country
function simulateCitySelection(
  currentState: FetchState,
  cityCode: string,
  countryCode: FetchCountryCode | null,
): FetchState {
  const allowedDatasetIds = resolveCountryDatasets(countryCode, {
    onlineOnly: true,
  }).map((dataset) => dataset.datasetId);

  const resetState: FetchState = {
    ...currentState,
    params: {
      cityCode,
      countryCode: null,
      datasetIds: [],
      bbox: null,
    },
  };

  return {
    ...resetState,
    params: {
      ...resetState.params,
      countryCode,
      datasetIds: resetState.params.datasetIds.filter((datasetId) =>
        allowedDatasetIds.includes(datasetId),
      ),
    },
    isCountryAutoResolved: Boolean(countryCode),
  };
}

describe('settings fetch datasets happy path (state/contract)', () => {
  it('transitions initial -> city -> dataset -> copy -> validate success', () => {
    const bosCity: City = {
      code: 'BOS',
      name: 'Boston',
      description: 'Fixture city for fetch tests',
      mapImageUrl: '',
      population: 1000,
      initialViewState: {
        zoom: 12,
        latitude: 42.3601,
        longitude: -71.0589,
        bearing: 0,
      },
      country: 'US',
    };

    let fetchState: FetchState = {
      ...INITIAL_FETCH_STATE,
      params: {
        ...INITIAL_FETCH_STATE.params,
      },
    };

    // Initially, all required parameters are missing, so we expect all validation errors to be present
    const initial = deriveFetchUi(fetchState);
    assert.equal(fetchState.params.cityCode, '');
    assert.equal(fetchState.params.countryCode, null);
    assert.equal(fetchState.params.bbox, null);
    assert.equal(initial.command, '');
    assert.equal(initial.canCopyCommand, false); // Copy command should not be available when there are validation errors
    assert.equal(initial.canValidateDatasets, false);
    assert.equal(initial.errors.length, 4);
    assert.ok(
      initial.errors.some((error) => error.includes('Select a city')),
      'Expected city warning in initial errors',
    );
    assert.ok(
      initial.errors.some((error) => error.includes('supported fetch country')),
      'Expected country warning in initial errors',
    );
    assert.ok(
      initial.errors.some((error) => error.includes('Select at least one dataset')),
      'Expected dataset warning in initial errors',
    );
    assert.ok(
      initial.errors.some((error) => error.includes('bbox unavailable')),
      'Expected bbox warning in initial errors',
    );

    const resolvedCountry = resolveCityCountryCode(bosCity);
    assert.equal(resolvedCountry, 'US');
    fetchState = simulateCitySelection(fetchState, bosCity.code, resolvedCountry);
    fetchState = {
      ...fetchState,
      params: {
        ...fetchState.params,
        bbox: {
          west: '-71.6694',
          south: '41.5557',
          east: '-71.1263',
          north: '42.0151',
        },
      },
    };

    const afterCity = deriveFetchUi(fetchState);
    assert.equal(fetchState.params.cityCode, 'BOS');
    assert.equal(fetchState.params.countryCode, 'US');
    assert.notEqual(fetchState.params.bbox, null);
    assert.equal(
      afterCity.errors.some((error) => error.includes('Select a city')),
      false,
    );
    assert.equal(
      afterCity.errors.some((error) => error.includes('supported fetch country')),
      false,
    );
    assert.equal(afterCity.canCopyCommand, false);
    assert.equal(afterCity.canValidateDatasets, false);

    const allowedDatasetIds = resolveCountryDatasets('US', {
      onlineOnly: true,
    }).map((dataset) => dataset.datasetId);
    const selectedDatasetId = allowedDatasetIds[0];
    assert.ok(selectedDatasetId, 'Expected at least one US fetch dataset');

    fetchState = {
      ...fetchState,
      params: {
        ...fetchState.params,
        datasetIds: [selectedDatasetId],
      },
    };

    const afterDatasetSelection = deriveFetchUi(fetchState);
    assert.equal(afterDatasetSelection.errors.length, 0);
    assert.notEqual(afterDatasetSelection.command, '');
    assert.equal(afterDatasetSelection.canCopyCommand, true);
    assert.equal(afterDatasetSelection.canValidateDatasets, false);

    fetchState = {
      ...fetchState,
      lastCopiedRequest: {
        cityCode: fetchState.params.cityCode,
        countryCode: fetchState.params.countryCode ?? 'US',
        datasetIds: [...fetchState.params.datasetIds],
        copiedAt: Date.now(),
      },
      lastValidationResult: null,
    };

    const afterCopy = deriveFetchUi(fetchState);
    assert.equal(afterCopy.canValidateDatasets, true);
    assert.deepEqual(fetchState.lastCopiedRequest?.datasetIds, [selectedDatasetId]);

    fetchState = {
      ...fetchState,
      lastValidationResult: {
        cityCode: fetchState.params.cityCode,
        foundIds: [selectedDatasetId],
        missingIds: [],
        updatedEntries: [],
        validatedAt: Date.now(),
      },
    };

    assert.equal(fetchState.lastValidationResult?.foundIds.includes(selectedDatasetId), true);
    assert.equal(fetchState.lastValidationResult?.missingIds.length, 0);
  });
});
