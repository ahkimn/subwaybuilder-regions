import { formatFixedNumber } from "src/core/utils";
import { DEFAULT_UNIT_LABELS, UNKNOWN_VALUE_DISPLAY } from "../../../core/constants";
import { ModeShare, RegionCommuterData, RegionGameData } from "../../../core/types";
import { DataRow } from "../../elements/DataRow";
import { DetailRow } from "../../elements/DetailRow";
import { Divider } from "../../elements/Divider";
import { ExpandButton } from "../../elements/ExpandButton";
import { SelectRow } from "../../elements/SelectRow";
import { CommutersViewState } from "./types";

const MAX_TABLE_ROWS = 10; // Max number of rows to show in commuters by region table before truncation


export function renderStatisticsView(
  featureData: RegionGameData
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'flex flex-col gap-2';

  const realPopulation = featureData.realPopulation;
  const demandPoints = featureData.demandData?.demandPoints;
  const residents = featureData.demandData?.residents;
  const workers = featureData.demandData?.workers;

  const unitLabel = featureData.unitNames?.singular;

  root.append(
    DetailRow('Name', featureData.displayName),
    DetailRow('Type', unitLabel ? unitLabel : DEFAULT_UNIT_LABELS.singular),
    DetailRow('Real Population', realPopulation ? formatFixedNumber(realPopulation) : UNKNOWN_VALUE_DISPLAY),
    Divider(),
    DetailRow('Demand Point Count', demandPoints ? formatFixedNumber(demandPoints) : UNKNOWN_VALUE_DISPLAY),
    DetailRow('Residents', residents ? formatFixedNumber(residents) : UNKNOWN_VALUE_DISPLAY),
    DetailRow('Jobs', workers ? formatFixedNumber(workers) : UNKNOWN_VALUE_DISPLAY),
    Divider(),
    DetailRow('Total Area', featureData.area ? `${formatFixedNumber(featureData.area, 2)} km²` : UNKNOWN_VALUE_DISPLAY),
    DetailRow('Playable Area', featureData.gameArea ? `${formatFixedNumber(featureData.gameArea, 2)} km²` : UNKNOWN_VALUE_DISPLAY),
    Divider(),
    DetailRow('Station Count', UNKNOWN_VALUE_DISPLAY), // TODO: (Feature): Pull from game state
    DetailRow('Track Length', UNKNOWN_VALUE_DISPLAY),
    DetailRow('Routes Serving Region', UNKNOWN_VALUE_DISPLAY),
  );
  return root;
}

export function renderCommutersView(
  commuterData: RegionCommuterData,
  viewState: CommutersViewState,
  setDirection: (direction: 'outbound' | 'inbound') => void
): HTMLElement {

  const root = document.createElement('div');
  root.className = 'flex flex-col gap-2 text-xs';

  const isOutbound = viewState.direction === 'outbound';

  const aggregateModeShare = isOutbound ? commuterData.residentModeShare : commuterData.workerModeShare;
  const byRegionModeShare = isOutbound ? commuterData.residentModeShareByRegion : commuterData.workerModeShareByRegion;

  const populationCount = ModeShare.total(aggregateModeShare)

  // --- Direction Select --- //
  const directionRow = new SelectRow(
    'commutes-direction',
    [
      { label: 'Residents', onSelect: () => setDirection('outbound') },
      { label: 'Workers', onSelect: () => setDirection('inbound') },
    ],
    isOutbound ? 0 : 1
  );

  root.appendChild(directionRow.element);

  // --- Summary Statistics --- //
  root.append(
    DetailRow(
      'Total Commuters',
      formatFixedNumber(populationCount)
    ),
    DetailRow(
      'Transit Mode Share',
      `${formatFixedNumber(aggregateModeShare.transit / populationCount * 100, 2)}%`
    ),
    DetailRow(
      'Driving Mode Share',
      `${formatFixedNumber(aggregateModeShare.driving / populationCount * 100, 2)}%`
    ),
    DetailRow(
      'Walking Mode Share',
      `${formatFixedNumber(aggregateModeShare.walking / populationCount * 100, 2)}%`
    ),
    Divider()
  );

  // --- Table Header --- //
  root.appendChild(
    DataRow(
      [isOutbound ? 'Destination' : 'Origin', 'Commuters', 'Transit Users'],
      {
        header: true,
        align: ['left', 'right', 'right']
      }
    )
  )

  // --- Mode Share by Region --- //
  const rows = Array.from(byRegionModeShare.entries()).map(([regionName, modeShare]) => {
    return {
      regionName: regionName,
      commuters: ModeShare.total(modeShare),
      transitCount: modeShare.transit
    }
  })
    .sort((a, b) => b.commuters - a.commuters); // sort by commuter count descending

  const maxRows = viewState.expanded ? rows.length : MAX_TABLE_ROWS;

  rows.slice(0, maxRows).forEach(({ regionName, commuters, transitCount }) => {
    root.appendChild(
      DataRow(
        [regionName, formatFixedNumber(commuters), `${formatFixedNumber(transitCount)}`],
        { align: ['left', 'right', 'right'] }
      )
    );
  });

  // --- Expanded Table --- //

  if (rows.length > MAX_TABLE_ROWS && !viewState.expanded) {
    const expandButton = ExpandButton(rows.length - MAX_TABLE_ROWS, () => root.replaceWith(
      renderCommutersView(commuterData, { ...viewState, expanded: true }, setDirection)
    ));
    root.appendChild(expandButton);
  }

  return root;
}
