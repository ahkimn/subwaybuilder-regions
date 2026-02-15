import type { createElement, ReactNode } from 'react';

import {
  DEFAULT_UNIT_LABELS,
  LOADING_VALUE_DISPLAY,
  UNKNOWN_VALUE_DISPLAY,
} from '../../../core/constants';
import type { RegionGameData } from '../../../core/types';
import { formatNumberOrDefault } from '../../../core/utils';
import { ReactDetailRow } from '../../elements/DetailRow';
import { ReactDivider } from '../../elements/Divider';
import { buildReactViewHeader } from '../shared/view-header';

export function renderStatisticsView(
  h: typeof createElement,
  gameData: RegionGameData,
): ReactNode {
  const realPopulation = gameData.realPopulation;
  const demandPoints = gameData.demandData?.demandPoints ?? 0;
  const residents = gameData.demandData?.residents ?? 0;
  const workers = gameData.demandData?.workers ?? 0;

  const unitLabel = gameData.unitTypes?.singular;

  const infraData = gameData.infraData;
  const existsInfraData = infraData !== undefined;

  return h(
    'div',
    { className: 'flex flex-col gap-2' },
    buildReactViewHeader(h, gameData.displayName),
    ReactDetailRow(
      h,
      'Type',
      unitLabel ? unitLabel : DEFAULT_UNIT_LABELS.singular,
    ),
    ReactDetailRow(h, 'Real Population', formatNumberOrDefault(realPopulation)),
    ReactDetailRow(
      h,
      'Area',
      gameData.area
        ? `${formatNumberOrDefault(gameData.area, 2)} km\u00B2`
        : UNKNOWN_VALUE_DISPLAY,
    ),
    ReactDivider(h),
    ReactDetailRow(
      h,
      'Demand Point Count',
      formatNumberOrDefault(demandPoints),
    ),
    ReactDetailRow(h, 'Residents', formatNumberOrDefault(residents)),
    ReactDetailRow(h, 'Jobs', formatNumberOrDefault(workers)),
    ReactDivider(h),
    ReactDetailRow(
      h,
      'Station Count',
      existsInfraData
        ? `${formatNumberOrDefault(infraData!.stations.size)}`
        : LOADING_VALUE_DISPLAY,
    ),
    ReactDetailRow(
      h,
      'Total Track Length',
      existsInfraData
        ? `${formatNumberOrDefault(
            Array.from(infraData!.trackLengths.values()).reduce(
              (a, b) => a + b,
              0,
            ),
            2,
          )} km`
        : LOADING_VALUE_DISPLAY,
    ),
    ReactDetailRow(
      h,
      'Routes Serving Region',
      existsInfraData
        ? `${formatNumberOrDefault(infraData!.routes.size)}`
        : LOADING_VALUE_DISPLAY,
    ),
  );
}
