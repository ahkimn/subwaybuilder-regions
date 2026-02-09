import { formatFixedNumber } from "../../../core/utils";
import { DEFAULT_UNIT_LABELS, LOADING_VALUE_DISPLAY, UNKNOWN_VALUE_DISPLAY } from "../../../core/constants";
import { ModeShare, RegionGameData } from "../../../core/types";
import { DataRowOptions, DataTable, DataTableRow } from "../../elements/DataTable";
import { DetailRow } from "../../elements/DetailRow";
import { Divider } from "../../elements/Divider";
import { ExtendButton } from "../../elements/ExtendButton";
import { SelectRow } from "../../elements/SelectRow";
import { CommutersViewState } from "./types";
import { InlineToggle } from "../../elements/InlineToggle";

const MAX_TABLE_ROWS = 10; // Max number of rows to show in commuters by region table before truncation
const MAX_UNEXPANDED_ROWS = 25; // Max number of rows to show in commuters by region table when expanded before requiring scroll

const PERCENT_DECIMALS = 2;

// --- Shared Elements --- //

function buildViewHeader(name: string): HTMLDivElement {
  const header = document.createElement('div');
  header.className = 'flex justify-between items-center text-sm font-medium';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'font-medium';
  nameSpan.textContent = name;
  header.appendChild(nameSpan);
  return header;
}

// --- Statistics View --- //

export function renderStatisticsView(
  gameData: RegionGameData,
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'flex flex-col gap-2';

  const realPopulation = gameData.realPopulation;
  const demandPoints = gameData.demandData?.demandPoints;
  const residents = gameData.demandData?.residents;
  const workers = gameData.demandData?.workers;

  const unitLabel = gameData.unitNames?.singular;

  const infraData = gameData.infraData;
  const existsInfraData = infraData !== undefined;

  root.append(
    buildViewHeader(gameData.displayName),
    DetailRow('Full Name', gameData.fullName),
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
    DetailRow('Station Count', existsInfraData ? `${formatFixedNumber(infraData!.stations.size)}` : LOADING_VALUE_DISPLAY), // TODO: (Feature): Pull from game state
    DetailRow('Total Track Length', existsInfraData ? `${formatFixedNumber(Array.from(infraData!.trackLengths.values()).reduce((a, b) => a + b, 0), 2)} km` : LOADING_VALUE_DISPLAY),
    // TODO: Show Route bullets, but this requires allowing overflow and likely a different base component structure than DetailRow
    DetailRow('Routes Serving Region', existsInfraData ? `${formatFixedNumber(infraData!.routes.size)}` : LOADING_VALUE_DISPLAY),
  );
  return root;
}

// --- Commuters View --- //

type CommuterRowData = {
  regionName: string;
  commuterValue: number;
  transitValue: number;
  drivingValue: number;
  walkingValue: number;
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

  const header = buildViewHeader(gameData.displayName);
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

  const tableData: Array<DataTableRow> = [
    ...buildTableHeader(viewState, () => root.replaceWith(renderCommutersView(gameData, viewState, setDirection)))
  ];

  // --- Mode Share by Region --- //
  const rows: CommuterRowData[] = Array.from(byRegionModeShare.entries()).map(([regionName, modeShare]) => {
    return {
      regionName: regionName,
      commuterValue: viewState.commuterCountDisplay === 'absolute' ? ModeShare.total(modeShare) : (ModeShare.total(modeShare) / populationCount * 100),
      transitValue: viewState.modeShareDisplay === 'absolute' ? modeShare.transit : ModeShare.share(modeShare, 'transit') * 100,
      drivingValue: viewState.modeShareDisplay === 'absolute' ? modeShare.driving : ModeShare.share(modeShare, 'driving') * 100,
      walkingValue: viewState.modeShareDisplay === 'absolute' ? modeShare.walking : ModeShare.share(modeShare, 'walking') * 100
    }
  })
    .sort((a, b) =>
      viewState.sortIndex === 1 ? b.commuterValue - a.commuterValue // sort by commuter count
        : viewState.sortIndex === 2 ? b.transitValue - a.transitValue // sort by transit commuter count
          : viewState.sortIndex === 3 ? b.drivingValue - a.drivingValue // sort by driving commuter count
            : viewState.sortIndex === 4 ? b.walkingValue - a.walkingValue // sort by walking commuter count
              : a.regionName.localeCompare(b.regionName) // sort alphabetically be region name
    ); // sort by column index
  if (viewState.sortDirection === 'asc') {
    rows.reverse();
  }

  const maxRows = viewState.expanded ? rows.length : MAX_TABLE_ROWS;

  rows.slice(0, maxRows).forEach((rowData) => {
    tableData.push(buildTableRow(viewState, rowData));
  });

  root.appendChild(DataTable(getColumnTemplate(viewState), tableData));

  // --- Expand/Collapse Table --- //

  if (rows.length > MAX_TABLE_ROWS && !viewState.expanded) {
    const expandButton = ExtendButton('Expand', rows.length - MAX_TABLE_ROWS, () => {
      viewState.expanded = true;
      root.replaceWith(
        renderCommutersView(gameData, viewState, setDirection)
      );
    });
    root.appendChild(expandButton);
  }

  if (rows.length > MAX_TABLE_ROWS && viewState.expanded) {
    const expandButton = ExtendButton('Collapse', rows.length - MAX_TABLE_ROWS, () => {
      viewState.expanded = false;
      root.replaceWith(
        renderCommutersView(gameData, viewState, setDirection)
      );
    });
    root.appendChild(expandButton);
  }

  return root;
}

function buildSummaryStatistics(populationCount: number, aggregateModeShare: ModeShare): HTMLElement[] {
  return [
    DetailRow('Total Commuters', formatFixedNumber(populationCount)),
    DetailRow('Transit Mode Share', `${formatFixedNumber(aggregateModeShare.transit / populationCount * 100, PERCENT_DECIMALS)}%`),
    DetailRow('Driving Mode Share', `${formatFixedNumber(aggregateModeShare.driving / populationCount * 100, PERCENT_DECIMALS)}%`),
    DetailRow('Walking Mode Share', `${formatFixedNumber(aggregateModeShare.walking / populationCount * 100, PERCENT_DECIMALS)}%`),
    Divider(2),
  ]
}

function getColumnTemplate(viewState: CommutersViewState): string {
  const base = ['minmax(6rem,1fr)', 'minmax(4.5rem,12rem)', 'minmax(4.5rem,15rem)'];

  if (viewState.modeShareLayout === 'all') {
    base.push('minmax(4.5rem,9rem)', 'minmax(4.5rem,9rem)');
  }

  return base.join(' ');
}

function buildTableHeader(viewState: CommutersViewState, render: () => void): DataTableRow[] {

  function changeSort(columnIndex: number) {
    if (viewState.sortIndex === columnIndex) {
      viewState.sortDirection = viewState.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      viewState.sortIndex = columnIndex;
      viewState.sortDirection = 'desc';
    }
    render();
  }

  const sortHandlers = [
    () => changeSort(0),
    () => changeSort(1),
    () => changeSort(2),
    () => changeSort(3),
    () => changeSort(4)
  ]

  const directionHeadLabel = viewState.direction === 'outbound' ? 'Destination' : 'Origin';
  const commuterHeadLabel = viewState.commuterCountDisplay === 'absolute' ? 'Commuters' : 'Commuter Share';
  const transitHeadLabel = viewState.modeShareDisplay === 'absolute' ? 'Transit' : 'Transit (%)';
  const drivingHeadLabel = viewState.modeShareDisplay === 'absolute' ? 'Driving' : 'Driving (%)';
  const walkingHeadLabel = viewState.modeShareDisplay === 'absolute' ? 'Walking' : 'Walking (%)';

  const titleRow: DataTableRow = {
    rowValues: [
      directionHeadLabel,
      commuterHeadLabel,
      transitHeadLabel,
      ...(viewState.modeShareLayout === 'all' ? [
        drivingHeadLabel,
        walkingHeadLabel
      ] : [])
    ],
    options: {
      header: true,
      onClick: sortHandlers,
      align: ['left', 'right', 'right', 'right', 'right'],
      sortState: {
        index: viewState.sortIndex,
        directionLabel: viewState.sortDirection === 'asc' ? '▲' : '▼',
        sortSelectedClass: 'text-foreground'
      }
    }
  };



  const commutersDiv = document.createElement('div');
  commutersDiv.className = 'flex justify-end gap-1 opacity-80';
  commutersDiv.appendChild(
    InlineToggle<CommutersViewState>(viewState,
      [[
        { value: 'absolute', field: 'commuterCountDisplay', label: 'Abs' },
        { value: 'percentage', field: 'commuterCountDisplay', label: '%' }
      ]],
      (v: CommutersViewState) => {
        Object.assign(viewState, v);
        render();
      }
    ))

  const allModeShare = viewState.modeShareLayout === 'all'
  const modeShareDiv = document.createElement('div');
  modeShareDiv.className = 'flex gap-1 opacity-80';
  modeShareDiv.className += ' justify-end';
  modeShareDiv.appendChild(
    InlineToggle<CommutersViewState>(viewState,
      [[
        { value: 'absolute', field: 'modeShareDisplay', label: 'Abs' },
        { value: 'percentage', field: 'modeShareDisplay', label: '%' }],
      [
        { value: 'transit', field: 'modeShareLayout', label: 'Transit' },
        { value: 'all', field: 'modeShareLayout', label: 'All' }
      ]]
      , (v: CommutersViewState) => {
        // If switching from all to transit, reset sort index to prevent trying to sort by now hidden columns
        if (viewState.modeShareLayout === 'all' && v.modeShareLayout === 'transit') {
          viewState.sortIndex = Math.max(viewState.sortIndex, 2);
        }
        Object.assign(viewState, v);
        render();
      }
    )
  );


  const togglesRow = {
    rowValues: ['', commutersDiv, modeShareDiv],
    options: {
      header: true,
      borderBottom: true,
      colSpan: [1, 1, allModeShare ? 3 : 1],
      align: ['left', 'right', 'right']
    } as DataRowOptions
  };

  return [titleRow, togglesRow];
}

function buildTableRow(viewState: CommutersViewState, rowData: CommuterRowData): {
  rowValues: Array<string | number>;
  options: DataRowOptions;
} {
  const { regionName, commuterValue, transitValue, drivingValue, walkingValue } = rowData;
  const rowValues: Array<string | number> = [
    regionName,
    viewState.commuterCountDisplay === 'absolute' ? formatFixedNumber(commuterValue) : `${formatFixedNumber(commuterValue, PERCENT_DECIMALS)}%`,
    viewState.modeShareDisplay === 'absolute' ? formatFixedNumber(transitValue) : `${formatFixedNumber(transitValue, PERCENT_DECIMALS)}%`
  ];
  const options: DataRowOptions = {
    align: ['left', 'right', 'right']
  };

  if (viewState.modeShareLayout === 'all') {
    rowValues.push(
      viewState.modeShareDisplay === 'absolute' ? formatFixedNumber(drivingValue) : `${formatFixedNumber(drivingValue, PERCENT_DECIMALS)}%`,
      viewState.modeShareDisplay === 'absolute' ? formatFixedNumber(walkingValue) : `${formatFixedNumber(walkingValue, PERCENT_DECIMALS)}%`
    );
    options.align?.push('right', 'right');
  }

  return { rowValues, options };
}
