import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { installDomEnvironment } from '@test/helpers/dom-environment';
import { cleanup, render } from '@testing-library/react';
import React, { useState } from 'react';

import { renderDatasetRegistrySection } from '@/ui/panels/settings/sections/registry';
import type { SettingsDatasetRow } from '@/ui/panels/settings/types';
import { SortDirection } from '@/ui/panels/types';

const TEST_ROW: SettingsDatasetRow = {
  rowKey: 'AUS:counties:dynamic',
  cityCode: 'AUS',
  cityName: 'Austin',
  datasetId: 'counties',
  displayName: 'Counties',
  origin: 'dynamic',
  fileSizeMB: 0.17,
  issue: null,
};

describe('settings registry UI', () => {
  let restoreDom: (() => void) | null = null;

  beforeEach(() => {
    restoreDom = installDomEnvironment();
  });

  afterEach(() => {
    cleanup();
    restoreDom?.();
    restoreDom = null;
  });

  it('renders registry title with active count chip styling', () => {
    const rows = Array.from({ length: 23 }, (_, index) => ({
      ...TEST_ROW,
      rowKey: `${TEST_ROW.rowKey}:${index}`,
    }));

    const { container } = render(
      renderDatasetRegistrySection(React.createElement, {
        useStateHook: useState,
        Input: (props) => React.createElement('input', { ...props }),
        rows,
        searchTerm: '',
        sortState: {
          sortIndex: 0,
          sortDirection: SortDirection.Asc,
          previousSortIndex: 0,
          previousSortDirection: SortDirection.Asc,
        },
        isRefreshingRegistry: false,
        isClearingMissing: false,
        onSearchTermChange: () => {},
        onSortChange: () => {},
        onRefreshRegistry: () => {},
        onClearMissing: () => {},
      }),
    );

    assert.ok(
      (container.textContent ?? '').includes('Dataset Registry'),
      'Expected registry title to be rendered',
    );

    const chip = Array.from(container.querySelectorAll('span')).find((node) =>
      (node.textContent ?? '').includes('23 active'),
    );
    assert.ok(chip, 'Expected active count chip');
    assert.match(chip.className, /bg-primary\/10/);
    assert.match(chip.className, /text-primary/);
  });
});
