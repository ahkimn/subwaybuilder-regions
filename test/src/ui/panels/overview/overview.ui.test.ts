import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RegionGameData, RegionSelection } from '@/core/domain';
import { OVERVIEW_HEADER_LABELS } from '@/ui/panels/overview/constants';
import { sortRows } from '@/ui/panels/overview/tabs/overview';
import type { RegionsOverviewRow } from '@/ui/panels/overview/types';
import { SortDirection } from '@/ui/panels/types';

function createGameData(
  featureId: string | number,
  displayName: string,
  stationOdRidershipSum?: number,
): RegionGameData {
  return {
    datasetId: 'districts',
    featureId,
    fullName: displayName,
    displayName,
    unitTypes: { singular: 'district', plural: 'districts' },
    area: 10,
    gameArea: 10,
    realPopulation: 1000,
    demandData: {
      demandPointIds: new Set(),
      populationIds: new Set(),
      demandPoints: 3,
      residents: 200,
      workers: 150,
    },
    commuterSummary: {
      residentModeShare: { transit: 50, driving: 100, walking: 50, unknown: 0 },
      workerModeShare: { transit: 40, driving: 80, walking: 30, unknown: 0 },
      averageResidentCommuteDistance: 5,
      averageWorkerCommuteDistance: 6,
      metadata: { lastUpdate: 1, dirty: false },
    },
    infraData:
      stationOdRidershipSum === undefined
        ? undefined
        : {
            stations: new Map([['station-a', 'Station A']]),
            stationRidership: {
              odById: new Map([['station-a', stationOdRidershipSum]]),
              totalById: new Map([['station-a', stationOdRidershipSum]]),
              odSum: stationOdRidershipSum,
              totalSum: stationOdRidershipSum,
              transferEstimateSum: 0,
            },
            tracks: new Map(),
            trackLengths: new Map([['metro', 10]]),
            routes: new Set(['route-a']),
            routeDisplayParams: new Map(),
            metadata: { lastUpdate: 1, dirty: false },
          },
  };
}

function createRow(gameData: RegionGameData): RegionsOverviewRow {
  return {
    selection: {
      datasetIdentifier: 'BOS-districts',
      featureId: gameData.featureId,
    } satisfies RegionSelection,
    gameData,
  };
}

describe('overview tab', () => {
  it('adds the Station O/D column immediately after Stations', () => {
    const stationIndex = OVERVIEW_HEADER_LABELS.indexOf('Stations');
    assert.equal(OVERVIEW_HEADER_LABELS[stationIndex + 1], 'Station O/D');
  });

  it('sorts rows by Station O/D descending and treats missing infra as zero', () => {
    const rows = [
      createRow(createGameData(1, 'Low Ridership', 20)),
      createRow(createGameData(2, 'Loading Region')),
      createRow(createGameData(3, 'High Ridership', 120)),
    ];

    const sortedRows = sortRows(rows, {
      sortIndex: 10,
      sortDirection: SortDirection.Desc,
      previousSortIndex: 10,
      previousSortDirection: SortDirection.Desc,
    });

    assert.equal(sortedRows[0]?.gameData.displayName, 'High Ridership');
    assert.equal(sortedRows[1]?.gameData.displayName, 'Low Ridership');
    assert.equal(sortedRows[2]?.gameData.displayName, 'Loading Region');
    assert.equal(sortedRows[2]?.gameData.infraData, undefined);
  });
});
