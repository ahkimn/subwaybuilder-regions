import { RegionGameData } from "../../../core/datasets/types";
import { formatFixedNumber } from "../../../utils/utils";
import { DataRow } from "../../elements/DataRow";
import { DetailRow } from "../../elements/DetailRow";
import { Divider } from "../../elements/Divider";

export function renderStatisticsView(
  datasetId: string,
  featureData: RegionGameData
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'flex flex-col gap-2';

  const realPopulation = featureData.realPopulation;
  const demandPoints = featureData.demandData?.demandPoints;
  const residents = featureData.demandData?.residents;
  const workers = featureData.demandData?.workers;

  root.append(
    DetailRow('Name', featureData.displayName),
    DetailRow('Type', 'County'),
    DetailRow('Real Population', realPopulation ? formatFixedNumber(realPopulation) : '—'),
    Divider(),
    DetailRow('Demand Point Count', demandPoints ? formatFixedNumber(demandPoints) : '—'),
    DetailRow('Residents', residents ? formatFixedNumber(residents) : '—'),
    DetailRow('Jobs', workers ? formatFixedNumber(workers) : '—'),
    Divider(),
    DetailRow('Total Area', `${formatFixedNumber(featureData.area, 2)} km²`),
    DetailRow('Playable Area', `${formatFixedNumber(featureData.gameArea, 2)} km²`),
    Divider(),
    DetailRow('Station Count', '—'), // TODO: Pull from game state
    DetailRow('Track Length', '—'),
    DetailRow('Routes Serving Region', '—'),
  );
  return root;
}

export function renderCommutersView(
  featureData: RegionGameData
): HTMLElement {

  const root = document.createElement('div');
  root.className = 'flex flex-col gap-2 text-xs';

  const header = document.createElement('div');
  header.className = 'flex justify-between items-center';

  header.innerHTML = `
    <span class="font-medium">Commutes</span>
    <button class="text-xs text-primary underline">Expand</button>
  `;

  root.appendChild(header);

  // Placeholder rows
  root.appendChild(DataRow(['Downtown', 1200, '63%']));
  root.appendChild(DataRow(['Midtown', 840, '51%']));

  return root;
}
