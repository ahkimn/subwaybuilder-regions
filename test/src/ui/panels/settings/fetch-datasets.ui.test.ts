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
  REGIONS_SETTINGS_FETCH_OPEN_MOD_FOLDER_BUTTON_ID,
  REGIONS_SETTINGS_FETCH_STATUS_ID,
  REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID,
  regionsFetchDatasetCardId,
} from '../../../../../src/core/constants';
import type {
  FetchBBox,
  FetchParameters,
  FetchValidationResult,
  LastCopiedFetchRequest,
} from '../../../../../src/ui/panels/settings/fetch-helpers';
import {
  buildFetchErrors,
  deriveFetchActionAvailability,
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
const FIRST_US_DATASET_ID =
  resolveCountryDatasets('US', { onlineOnly: true })[0]?.datasetId ??
  'counties';

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

const PVD_CITY: City = {
  code: 'PVD',
  name: 'Providence',
  description: 'Fixture unresolved-country city',
  mapImageUrl: '',
  population: 1000,
  initialViewState: {
    zoom: 11,
    latitude: 41.824,
    longitude: -71.4128,
    bearing: 0,
  },
};

type FetchHarnessState = {
  request: FetchParameters;
  isCountryAutoResolved: boolean;
  lastCopiedRequest: LastCopiedFetchRequest | null;
  lastOpenedModsFolderRequest: LastCopiedFetchRequest | null;
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
    lastOpenedModsFolderRequest: null,
    lastValidationResult: null,
    isValidatingDatasets: false,
  });

  const cities = useMemo(() => [ATL_CITY, BOSTON_CITY, PVD_CITY], []);
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
  const actionAvailability = deriveFetchActionAvailability({
    command,
    request: state.request,
    lastCopiedRequest: state.lastCopiedRequest,
    lastOpenedModsFolderRequest: state.lastOpenedModsFolderRequest,
  });

  const fetchParams: SettingsFetchSectionParams = {
    request: state.request,
    errors,
    command,
    canCopyCommand: actionAvailability.canCopyCommand,
    canOpenModsFolder: actionAvailability.canOpenModsFolder,
    canValidateDatasets: actionAvailability.canValidateDatasets,
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
      const bbox = state.request.bbox;
      if (!bbox) {
        return;
      }
      setState((prev) => ({
        ...prev,
        lastCopiedRequest: {
          cityCode: prev.request.cityCode,
          countryCode: prev.request.countryCode!,
          datasetIds: [...prev.request.datasetIds],
          bbox: { ...bbox },
          copiedAt: Date.now(),
        },
        lastOpenedModsFolderRequest: null,
        lastValidationResult: null,
      }));
    },
    onOpenModsFolder: () => {
      if (!actionAvailability.canOpenModsFolder || !state.lastCopiedRequest) {
        return;
      }
      setState((prev) => ({
        ...prev,
        lastOpenedModsFolderRequest: {
          ...prev.lastCopiedRequest!,
          copiedAt: Date.now(),
        },
      }));
    },
    onValidateDatasets: () => {
      if (!state.lastCopiedRequest || !actionAvailability.canValidateDatasets) {
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
    assertButtonDisabled(
      REGIONS_SETTINGS_FETCH_OPEN_MOD_FOLDER_BUTTON_ID,
      container,
    );
    assertButtonDisabled(REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID, container);

    const cityField = byRegionsId(
      REGIONS_SETTINGS_FETCH_CITY_FIELD_ID,
      container,
    );
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
    assertButtonDisabled(
      REGIONS_SETTINGS_FETCH_OPEN_MOD_FOLDER_BUTTON_ID,
      container,
    );
    assertButtonDisabled(REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID, container);

    const datasetsField = byRegionsId(
      REGIONS_SETTINGS_FETCH_DATASETS_FIELD_ID,
      container,
    );
    const firstDatasetCard = datasetsField.querySelector(
      `[data-regions-id="${regionsFetchDatasetCardId(FIRST_US_DATASET_ID)}"]`,
    );
    assert.ok(firstDatasetCard, 'Expected first dataset card');
    assert.equal(
      firstDatasetCard?.getAttribute('aria-pressed'),
      'false',
      'Expected dataset card to be unselected by default',
    );
    await user.click(firstDatasetCard as HTMLElement);
    assert.equal(
      firstDatasetCard?.getAttribute('aria-pressed'),
      'true',
      'Expected dataset card to be selected after first click',
    );
    await user.click(firstDatasetCard as HTMLElement);
    assert.equal(
      firstDatasetCard?.getAttribute('aria-pressed'),
      'false',
      'Expected dataset card to be deselected after second click',
    );
    await user.click(firstDatasetCard as HTMLElement);

    assert.equal(existsWarning('datasets', container), false);
    assert.equal(
      container.querySelectorAll(
        `[data-regions-id="${REGIONS_SETTINGS_FETCH_COMMAND_WARNING_ID}"]`,
      ).length,
      0,
    );
    assertButtonEnabled(REGIONS_SETTINGS_FETCH_COPY_BUTTON_ID, container);
    assertButtonDisabled(
      REGIONS_SETTINGS_FETCH_OPEN_MOD_FOLDER_BUTTON_ID,
      container,
    );
    assertButtonDisabled(REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID, container);

    const copyButton = byRegionsId(
      REGIONS_SETTINGS_FETCH_COPY_BUTTON_ID,
      container,
    );
    await user.click(copyButton);

    assertButtonEnabled(
      REGIONS_SETTINGS_FETCH_OPEN_MOD_FOLDER_BUTTON_ID,
      container,
    );
    assertButtonDisabled(REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID, container);
    assertText(
      REGIONS_SETTINGS_FETCH_STATUS_ID,
      /Open mods folder to enable dataset validation./,
      container,
    );

    const openModsFolderButton = byRegionsId(
      REGIONS_SETTINGS_FETCH_OPEN_MOD_FOLDER_BUTTON_ID,
      container,
    );
    await user.click(openModsFolderButton);

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

  it('disables country selector when no city is selected and enables it for unresolved city', async () => {
    const user = userEvent.setup({ document: globalThis.document });
    const { container, getByRole } = render(
      React.createElement(FetchDatasetsHarness),
    );

    const countryFieldInitial = byRegionsId(
      REGIONS_SETTINGS_FETCH_COUNTRY_FIELD_ID,
      container,
    );
    assert.equal(
      countryFieldInitial.querySelector('summary'),
      null,
      'Expected country selector disabled before city selection',
    );

    const cityField = byRegionsId(
      REGIONS_SETTINGS_FETCH_CITY_FIELD_ID,
      container,
    );
    const cityMenuTrigger = cityField.querySelector('summary');
    assert.ok(cityMenuTrigger, 'Expected city SelectMenu trigger');
    await user.click(cityMenuTrigger as HTMLElement);
    await user.click(getByRole('button', { name: 'Providence (PVD)' }));

    const countryFieldAfterPvd = byRegionsId(
      REGIONS_SETTINGS_FETCH_COUNTRY_FIELD_ID,
      container,
    );
    assert.ok(
      countryFieldAfterPvd.querySelector('summary'),
      'Expected country selector enabled for unresolved city',
    );
  });
});
