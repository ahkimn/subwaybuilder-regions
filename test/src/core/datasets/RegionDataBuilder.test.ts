import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Feature, Polygon } from 'geojson';

import { RegionDataBuilder } from '@/core/datasets/RegionDataBuilder';
import type { RegionDataset } from '@/core/datasets/RegionDataset';
import type { RegionGameData } from '@/core/domain';
import { prepareBoundaryParams } from '@/core/geometry/arc-length';
import type { ModdingAPI } from '@/types/api';

function createFeature(
  id: string | number,
  name: string,
  coordinates: Polygon['coordinates'],
): Feature<Polygon> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates,
    },
    properties: {
      ID: id,
      NAME: name,
      DISPLAY_NAME: name,
    },
  };
}

function createGameData(
  featureId: string | number,
  displayName: string,
): RegionGameData {
  return {
    datasetId: 'districts',
    featureId,
    fullName: displayName,
    displayName,
    unitTypes: { singular: 'district', plural: 'districts' },
    area: null,
    gameArea: null,
    realPopulation: null,
  };
}

function createTestDataset(): RegionDataset {
  const regionA = createFeature(1, 'Region A', [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ]);
  const regionB = createFeature(2, 'Region B', [
    [
      [2, 0],
      [3, 0],
      [3, 1],
      [2, 1],
      [2, 0],
    ],
  ]);

  const gameData = new Map<string | number, RegionGameData>([
    [1, createGameData(1, 'Region A')],
    [2, createGameData(2, 'Region B')],
  ]);
  const candidateIds = new Set<string | number>([1, 2]);

  return {
    id: 'districts',
    boundaryData: {
      type: 'FeatureCollection',
      features: [regionA, regionB],
    },
    regionBoundaryParamsMap: new Map([
      [1, prepareBoundaryParams(regionA)],
      [2, prepareBoundaryParams(regionB)],
    ]),
    gameData,
    getRegionGameData(featureId: string | number) {
      return gameData.get(featureId) ?? null;
    },
    queryBoundaryCandidatesByPoint() {
      return candidateIds;
    },
    queryBoundaryCandidatesByBBox() {
      return candidateIds;
    },
  } as unknown as RegionDataset;
}

function createApi(): ModdingAPI {
  const ridershipByStation = new Map([
    ['station-a', { total: 100, transfers: 40 }],
    ['station-b', { total: 80 }],
  ]);

  return {
    gameState: {
      getStations() {
        return [
          {
            id: 'station-a',
            name: 'Station A',
            coords: [0.5, 0.5],
            buildType: 'constructed',
            stNodeIds: ['node-a'],
          },
          {
            id: 'station-b',
            name: 'Station B',
            coords: [2.5, 0.5],
            buildType: 'constructed',
            stNodeIds: ['node-b'],
          },
        ];
      },
      getTracks() {
        return [];
      },
      getRoutes() {
        return [];
      },
      getStationRidership(stationId?: string | null) {
        assert.ok(stationId, 'Expected stationId for ridership lookup');
        const ridership = ridershipByStation.get(stationId);
        assert.ok(
          ridership,
          `Unexpected station ridership lookup for ${stationId}`,
        );
        return ridership;
      },
      getElapsedSeconds() {
        return 120;
      },
    },
  } as unknown as ModdingAPI;
}

describe('RegionDataBuilder infra station ridership', () => {
  it('builds station O/D ridership and estimated totals for both region and dataset infra data', async () => {
    const builder = new RegionDataBuilder(createApi());
    const dataset = createTestDataset();

    const regionInfra = await builder.buildRegionInfraData(dataset, 1);
    assert.ok(regionInfra, 'Expected region infra data');
    assert.equal(regionInfra.stationRidership.odById.get('station-a'), 60);
    assert.equal(regionInfra.stationRidership.totalById.get('station-a'), 100);
    assert.equal(regionInfra.stationRidership.odSum, 60);
    assert.equal(regionInfra.stationRidership.transferEstimateSum, 20);
    assert.equal(regionInfra.stationRidership.totalSum, 80);

    const datasetInfra = await builder.buildDatasetInfraData(dataset);
    const regionAData = datasetInfra.get(1);
    const regionBData = datasetInfra.get(2);

    assert.ok(regionAData, 'Expected region A dataset infra data');
    assert.ok(regionBData, 'Expected region B dataset infra data');

    assert.equal(regionAData.stationRidership.odById.get('station-a'), 60);
    assert.equal(regionAData.stationRidership.totalById.get('station-a'), 100);
    assert.equal(regionAData.stationRidership.odSum, 60);
    assert.equal(regionAData.stationRidership.transferEstimateSum, 20);
    assert.equal(regionAData.stationRidership.totalSum, 80);

    assert.equal(regionBData.stationRidership.odById.get('station-b'), 80);
    assert.equal(regionBData.stationRidership.totalById.get('station-b'), 80);
    assert.equal(regionBData.stationRidership.odSum, 80);
    assert.equal(regionBData.stationRidership.transferEstimateSum, 0);
    assert.equal(regionBData.stationRidership.totalSum, 80);
  });
});
