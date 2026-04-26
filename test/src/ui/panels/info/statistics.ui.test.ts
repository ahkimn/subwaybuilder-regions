import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RegionGameData } from '@regions/core/domain';
import { renderStatisticsView } from '@regions/ui/panels/info/tabs/statistics';
import { setupDomTestLifecycle } from '@test/helpers/ui-test-suite';
import { render } from '@testing-library/react';
import React from 'react';

function createGameData(overrides?: Partial<RegionGameData>): RegionGameData {
  return {
    datasetId: 'districts',
    featureId: 1,
    fullName: 'Region A',
    displayName: 'Region A',
    unitTypes: { singular: 'district', plural: 'districts' },
    area: 12.5,
    gameArea: 10.2,
    realPopulation: 1000,
    demandData: {
      demandPointIds: new Set(),
      populationIds: new Set(),
      demandPoints: 5,
      residents: 300,
      workers: 200,
    },
    commuterSummary: {
      residentModeShare: {
        transit: 100,
        driving: 100,
        walking: 100,
        unknown: 0,
      },
      workerModeShare: { transit: 60, driving: 80, walking: 60, unknown: 0 },
      averageResidentCommuteDistance: 4,
      averageWorkerCommuteDistance: 6,
      metadata: { lastUpdate: 1, dirty: false },
    },
    infraData: {
      stations: new Map([
        ['station-a', 'Station A'],
        ['station-b', 'Station B'],
      ]),
      stationRidership: {
        odById: new Map([
          ['station-a', 60],
          ['station-b', 80],
        ]),
        totalById: new Map([
          ['station-a', 100],
          ['station-b', 80],
        ]),
        odSum: 140,
        totalSum: 160,
        transferEstimateSum: 20,
      },
      tracks: new Map(),
      trackLengths: new Map([['metro', 12.5]]),
      routes: new Set(['route-a']),
      routeDisplayParams: new Map(),
      metadata: { lastUpdate: 1, dirty: false },
    },
    ...overrides,
  };
}

describe('statistics view', () => {
  setupDomTestLifecycle();

  it('renders station O/D ridership when infra data is present', () => {
    const { container } = render(
      renderStatisticsView(React.createElement, createGameData()),
    );

    assert.match(container.textContent ?? '', /Station O\/D Ridership/);
    assert.match(container.textContent ?? '', /140/);
  });

  it('shows loading placeholder for station O/D ridership while infra data is absent', () => {
    const { container } = render(
      renderStatisticsView(
        React.createElement,
        createGameData({ infraData: undefined }),
      ),
    );

    assert.match(container.textContent ?? '', /Station O\/D Ridership/);
    assert.match(container.textContent ?? '', /Loading\.\.\./);
  });
});
