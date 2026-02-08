import { formatFixedNumber } from "../../../core/utils";
import { DEFAULT_UNIT_LABELS, UNKNOWN_VALUE_DISPLAY } from "../../../core/constants";
import { ModeShare, RegionGameData } from "../../../core/types";
import { DataRowOptions, DataTable } from "../../elements/DataTable";
import { DetailRow } from "../../elements/DetailRow";
import { Divider } from "../../elements/Divider";
import { ExpandButton } from "../../elements/ExpandButton";
import { SelectRow } from "../../elements/SelectRow";
import { CommutersViewState } from "./types";

const MAX_TABLE_ROWS = 10; // Max number of rows to show in commuters by region table before truncation

type CommuterRowData = {
  regionName: string;
  commuters: number;
  transitCount: number;
  drivingCount: number;
  walkingCount: number;
}

export function renderStatisticsView(
  gameData: RegionGameData
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'flex flex-col gap-2';

  const realPopulation = gameData.realPopulation;
  const demandPoints = gameData.demandData?.demandPoints;
  const residents = gameData.demandData?.residents;
  const workers = gameData.demandData?.workers;

  const unitLabel = gameData.unitNames?.singular;

  root.append(
    DetailRow('Name', gameData.displayName),
    DetailRow('Type', unitLabel ? unitLabel : DEFAULT_UNIT_LABELS.singular),
    DetailRow('Real Population', realPopulation ? formatFixedNumber(realPopulation) : UNKNOWN_VALUE_DISPLAY),
    Divider(),
    DetailRow('Demand Point Count', demandPoints ? formatFixedNumber(demandPoints) : UNKNOWN_VALUE_DISPLAY),
    DetailRow('Residents', residents ? formatFixedNumber(residents) : UNKNOWN_VALUE_DISPLAY),
    DetailRow('Jobs', workers ? formatFixedNumber(workers) : UNKNOWN_VALUE_DISPLAY),
    Divider(),
    DetailRow('Total Area', gameData.area ? `${formatFixedNumber(gameData.area, 2)} km²` : UNKNOWN_VALUE_DISPLAY),
    DetailRow('Playable Area', gameData.gameArea ? `${formatFixedNumber(gameData.gameArea, 2)} km²` : UNKNOWN_VALUE_DISPLAY),
    Divider(),
    DetailRow('Station Count', UNKNOWN_VALUE_DISPLAY), // TODO: (Feature): Pull from game state
    DetailRow('Track Length', UNKNOWN_VALUE_DISPLAY),
    DetailRow('Routes Serving Region', UNKNOWN_VALUE_DISPLAY),
  );
  return root;
}

export function renderCommutersView(
  gameData: RegionGameData,
  viewState: CommutersViewState,
  setDirection: (direction: 'outbound' | 'inbound') => void
): HTMLElement {

  const commuterData = gameData.commuterData!;

  const root = document.createElement('div');
  root.className = 'flex flex-col gap-2 text-xs';

  const isOutbound = viewState.direction === 'outbound';

  const aggregateModeShare = isOutbound ? commuterData.residentModeShare : commuterData.workerModeShare;
  const byRegionModeShare = isOutbound ? commuterData.residentModeShareByRegion : commuterData.workerModeShareByRegion;

  const populationCount = ModeShare.total(aggregateModeShare)

  const header = builtCommuterViewHeader(gameData.displayName);
  const directionRow = new SelectRow(
    'commutes-direction',
    [
      { label: 'Residents', onSelect: () => setDirection('outbound') },
      { label: 'Workers', onSelect: () => setDirection('inbound') },
    ],
    isOutbound ? 0 : 1
  );
  header.appendChild(directionRow.element);
  root.appendChild(header);


  root.append(...buildSummaryStatistics(populationCount, aggregateModeShare));

  const tableData: Array<{ rowValues: Array<string | number>, options?: DataRowOptions }> = [
    buildTableHeader(viewState)
  ];

  // --- Mode Share by Region --- //
  const rows: CommuterRowData[] = Array.from(byRegionModeShare.entries()).map(([regionName, modeShare]) => {
    return {
      regionName: regionName,
      commuters: ModeShare.total(modeShare),
      transitCount: modeShare.transit,
      drivingCount: modeShare.driving,
      walkingCount: modeShare.walking
    }
  })
    .sort((a, b) => b.commuters - a.commuters); // sort by commuter count descending

  const maxRows = viewState.expanded ? rows.length : MAX_TABLE_ROWS;

  rows.slice(0, maxRows).forEach((rowData) => {
    tableData.push(buildTableRow(viewState, populationCount, rowData));
  });

  root.appendChild(DataTable(getColumnTemplate(viewState), tableData));

  // --- Expanded Table --- //

  if (rows.length > MAX_TABLE_ROWS && !viewState.expanded) {
    const expandButton = ExpandButton(rows.length - MAX_TABLE_ROWS, () => {
      viewState.expanded = true;
      root.replaceWith(
        renderCommutersView(gameData, viewState, setDirection)
      );
    });
    root.appendChild(expandButton);
  }

  return root;
}

function builtCommuterViewHeader(name: string): HTMLDivElement {
  const header = document.createElement('div');
  header.className = 'flex justify-between items-center';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'font-medium';
  nameSpan.textContent = name;
  header.appendChild(nameSpan);
  return header;
}

function buildSummaryStatistics(populationCount: number, aggregateModeShare: ModeShare): HTMLElement[] {
  return [
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
  ]
}

function getColumnTemplate(viewState: CommutersViewState): string {
  const base = ['minmax(0,1fr)', 'auto', 'auto'];

  if (viewState.modeLayout === 'all') {
    base.push('auto', 'auto');
  }

  return base.join(' ');
}

function buildTableHeader(viewState: CommutersViewState): { rowValues: Array<string | number>, options: DataRowOptions } {
  const headerRowValues = [viewState.direction === 'outbound' ? 'Destination' : 'Origin', 'Commuters', 'Transit Users']
  const headerRowOptions = {
    header: true,
    align: ['left', 'right', 'right']
  }

  if (viewState.modeLayout === 'all') {
    headerRowValues.push('Driving Users', 'Walking Users');
    headerRowOptions.align?.push('right', 'right');
  }

  return { rowValues: headerRowValues, options: headerRowOptions as DataRowOptions };
}

function buildTableRow(viewState: CommutersViewState, totalCommuters: number, rowData: CommuterRowData): {
  rowValues: Array<string | number>;
  options: DataRowOptions;
} {
  const { regionName, commuters, transitCount, drivingCount, walkingCount } = rowData;
  const rowValues: Array<string | number> = [
    regionName,
    viewState.modeDisplay === 'absolute' ? formatFixedNumber(commuters) : formatFixedNumber(commuters / totalCommuters * 100, 2),
    viewState.modeDisplay === 'absolute' ? formatFixedNumber(transitCount) : formatFixedNumber(transitCount / commuters * 100, 2)
  ];
  const options: DataRowOptions = {
    align: ['left', 'right', 'right']
  };

  if (viewState.modeLayout === 'all') {
    rowValues.push(
      viewState.modeDisplay === 'absolute' ? formatFixedNumber(drivingCount) : formatFixedNumber(drivingCount / commuters * 100, 2),
      viewState.modeDisplay === 'absolute' ? formatFixedNumber(walkingCount) : formatFixedNumber(walkingCount / commuters * 100, 2)
    );
    options.align?.push('right', 'right');
  }

  return { rowValues, options };
}
