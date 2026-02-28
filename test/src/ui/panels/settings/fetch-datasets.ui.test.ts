import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  CATALOG_STATIC_COUNTRIES,
  resolveCountryDatasets,
} from '../../../../../shared/datasets/catalog';
import React, { useMemo, useState } from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  REGIONS_SETTINGS_FETCH_BBOX_FIELD_ID,
  REGIONS_SETTINGS_FETCH_CITY_FIELD_ID,
  REGIONS_SETTINGS_FETCH_COMMAND_WARNING_ID,
  REGIONS_SETTINGS_FETCH_COPY_BUTTON_ID,
  REGIONS_SETTINGS_FETCH_COUNTRY_FIELD_ID,
  REGIONS_SETTINGS_FETCH_DATASETS_FIELD_ID,
  REGIONS_SETTINGS_FETCH_STATUS_ID,
  REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID,
} from '../../../../../src/core/constants';
import type {
  FetchBBox,
  FetchCountryCode,
  FetchParameters,
  FetchValidationResult,
  LastCopiedFetchRequest,
} from '../../../../../src/ui/panels/settings/fetch-helpers';
import {
  buildFetchErrors,
  formatFetchCommand,
  resolveCityCountryCode,
} from '../../../../../src/ui/panels/settings/fetch-helpers';
import { renderFetchDatasetsSection } from '../../../../../src/ui/panels/settings/sections/fetch-datasets';
import type { SettingsFetchSectionParams } from '../../../../../src/ui/panels/settings/types';
import type { City } from '../../../../../src/types/cities';

import {
  assertButtonDisabled,
  assertButtonEnabled,
  assertText,
  byRegionsId,
  existsWarning,
} from '../../../../helpers/fetch-ui-assertions';
import { installDomEnvironment } from '../../../../helpers/dom-environment';

const BOS_BBOX: FetchBBox = {
  west: '-71.6694',
  south: '41.5557',
  east: '-71.1263',
  north: '42.0151',
};

const BOSTON_CITY: City = {
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
};

const ATL_CITY: City = {
  code: 'ATL',
  name: 'Atlanta',
  country: 'US',
  description: 'Fixture city',
  mapImageUrl: '',
  population: 1000,
  initialViewState: {
    zoom: 11,
    latitude: 33.75,
    longitude: -84.39,
    bearing: 0,
  },
};

type FetchHarnessState = {
  request: FetchParameters;
  isCountryAutoResolved: boolean;
  lastCopiedRequest: LastCopiedFetchRequest | null;
  lastValidationResult: FetchValidationResult | null;
  isValidatingDatasets: boolean;
};

function FetchDatasetsHarness(): React.ReactNode {
  const [state, setState] = useState<FetchHarnessState>({
    request: {
      cityCode: '',
      countryCode: null,
      datasetIds: [],
      bbox: null,
    },
    isCountryAutoResolved: false,
    lastCopiedRequest: null,
    lastValidationResult: null,
    isValidatingDatasets: false,
  });

  const cities = useMemo(() => [ATL_CITY, BOSTON_CITY], []);
  const cityByCode = useMemo(
    () => new Map(cities.map((city) => [city.code, city])),
    [cities],
  );

  const errors = buildFetchErrors({
    hasCity: Boolean(state.request.cityCode),
    hasCountry: state.request.countryCode !== null,
    hasDatasets: state.request.datasetIds.length > 0,
    hasBBox: state.request.bbox !== null,
  });

  const command =
    errors.length > 0
      ? ''
      : formatFetchCommand({
          platform: 'win32',
          params: state.request,
          relativeModPath: 'regions',
          outPath: '.\\regions\\data',
        });

  const datasets = resolveCountryDatasets(state.request.countryCode, {
    onlineOnly: true,
  });

  const fetchParams: SettingsFetchSectionParams = {
    request: state.request,
    errors,
    command,
    canValidateDatasets: state.lastCopiedRequest !== null,
    isValidatingDatasets: state.isValidatingDatasets,
    isOpeningModsFolder: false,
    isCountryAutoResolved: state.isCountryAutoResolved,
    lastCopiedRequest: state.lastCopiedRequest,
    lastValidationResult: state.lastValidationResult,
    cityOptions: cities.map((city) => ({ code: city.code, name: city.name })),
    countryOptions: [...CATALOG_STATIC_COUNTRIES],
    datasets,
    relativeModPath: 'regions',
    onCityCodeChange: (cityCode) => {
      const city = cityByCode.get(cityCode);
      const countryCode = resolveCityCountryCode(city);
      const bbox = cityCode === 'BOS' ? BOS_BBOX : null;
      setState((prev) => ({
        ...prev,
        request: {
          cityCode,
          countryCode,
          datasetIds: [],
          bbox,
        },
        isCountryAutoResolved: Boolean(countryCode),
      }));
    },
    onCountryCodeChange: (countryCode) => {
      setState((prev) => ({
        ...prev,
        request: {
          ...prev.request,
          countryCode,
          datasetIds: [],
        },
      }));
    },
    onToggleDataset: (datasetId) => {
      setState((prev) => {
        const exists = prev.request.datasetIds.includes(datasetId);
        return {
          ...prev,
          request: {
            ...prev.request,
            datasetIds: exists
              ? prev.request.datasetIds.filter((id) => id !== datasetId)
              : [...prev.request.datasetIds, datasetId],
          },
        };
      });
    },
    onCopyCommand: () => {
      if (!command || !state.request.countryCode) {
        return;
      }
      setState((prev) => ({
        ...prev,
        lastCopiedRequest: {
          cityCode: prev.request.cityCode,
          countryCode: prev.request.countryCode!,
          datasetIds: [...prev.request.datasetIds],
          copiedAt: Date.now(),
        },
        lastValidationResult: null,
      }));
    },
    onOpenModsFolder: () => {
      // no-op in UI harness
    },
    onValidateDatasets: () => {
      if (!state.lastCopiedRequest) {
        return;
      }
      setState((prev) => ({
        ...prev,
        isValidatingDatasets: false,
        lastValidationResult: {
          cityCode: prev.lastCopiedRequest!.cityCode,
          foundIds: [...prev.lastCopiedRequest!.datasetIds],
          missingIds: [],
          updatedEntries: [],
          validatedAt: Date.now(),
        },
      }));
    },
  };

  return renderFetchDatasetsSection(React.createElement, fetchParams);
}

describe('settings fetch datasets happy path (DOM interaction)', () => {
  let restoreDom: (() => void) | null = null;

  beforeEach(() => {
    restoreDom = installDomEnvironment();
  });

  afterEach(() => {
    cleanup();
    restoreDom?.();
    restoreDom = null;
  });

  it('renders and transitions through happy path states', async () => {
    const user = userEvent.setup({ document: globalThis.document });
    const { container, getByRole } = render(
      React.createElement(FetchDatasetsHarness),
    );

    assertText(REGIONS_SETTINGS_FETCH_CITY_FIELD_ID, 'Select city', container);
    assertText(REGIONS_SETTINGS_FETCH_COUNTRY_FIELD_ID, 'N/A', container);
    assertText(REGIONS_SETTINGS_FETCH_BBOX_FIELD_ID, 'N/A', container);
    assert.equal(existsWarning('city', container), true);
    assert.equal(existsWarning('country', container), true);
    assert.equal(existsWarning('datasets', container), true);
    assert.equal(existsWarning('command', container), true);
    assertButtonDisabled(REGIONS_SETTINGS_FETCH_COPY_BUTTON_ID, container);
    assertButtonDisabled(REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID, container);

    const cityField = byRegionsId(REGIONS_SETTINGS_FETCH_CITY_FIELD_ID, container);
    const cityMenuTrigger = cityField.querySelector('summary');
    assert.ok(cityMenuTrigger, 'Expected city SelectMenu trigger');
    await user.click(cityMenuTrigger as HTMLElement);
    await user.click(getByRole('button', { name: 'Boston (BOS)' }));

    assertText(REGIONS_SETTINGS_FETCH_COUNTRY_FIELD_ID, 'US', container);
    assert.equal(existsWarning('city', container), false);
    assert.equal(existsWarning('country', container), false);
    assertText(REGIONS_SETTINGS_FETCH_BBOX_FIELD_ID, BOS_BBOX.west, container);
    assert.equal(existsWarning('datasets', container), true);
    assert.equal(existsWarning('command', container), true);
    assertButtonDisabled(REGIONS_SETTINGS_FETCH_COPY_BUTTON_ID, container);
    assertButtonDisabled(REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID, container);

    const datasetsField = byRegionsId(
      REGIONS_SETTINGS_FETCH_DATASETS_FIELD_ID,
      container,
    );
    const firstDatasetCheckbox = datasetsField.querySelector(
      'input[type="checkbox"]',
    );
    assert.ok(firstDatasetCheckbox, 'Expected at least one dataset checkbox');
    await user.click(firstDatasetCheckbox as HTMLElement);

    assert.equal(existsWarning('datasets', container), false);
    assert.equal(
      container.querySelectorAll(
        `[data-regions-id="${REGIONS_SETTINGS_FETCH_COMMAND_WARNING_ID}"]`
      ).length,
      0,
    );
    assertButtonEnabled(REGIONS_SETTINGS_FETCH_COPY_BUTTON_ID, container);
    assertButtonDisabled(REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID, container);

    const copyButton = byRegionsId(REGIONS_SETTINGS_FETCH_COPY_BUTTON_ID, container);
    await user.click(copyButton);

    assertButtonEnabled(REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID, container);
    assertText(
      REGIONS_SETTINGS_FETCH_STATUS_ID,
      /Ready to validate BOS:/,
      container,
    );

    const validateButton = byRegionsId(
      REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID,
      container,
    );
    await user.click(validateButton);

    assertText(
      REGIONS_SETTINGS_FETCH_STATUS_ID,
      /Validated BOS: 1 found, 0 missing/,
      container,
    );
  });
});
