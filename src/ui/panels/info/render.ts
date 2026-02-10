import { formatFixedNumber } from "../../../core/utils";
import { DEFAULT_UNIT_LABELS, LOADING_VALUE_DISPLAY, UNKNOWN_VALUE_DISPLAY } from "../../../core/constants";
import { ModeShare, RegionGameData } from "../../../core/types";
import { DataRowOptions, DataTable, DataTableRow, TableOptions } from "../../elements/DataTable";
import { DetailRow } from "../../elements/DetailRow";
import { Divider } from "../../elements/Divider";
import { ExtendButton } from "../../elements/ExtendButton";
import { SelectRow } from "../../elements/SelectRow";
import { CommutersViewState, SortDirection } from "./types";
import { InlineToggle } from "../../elements/InlineToggle";

const DEFAULT_TABLE_ROWS = 10; // Max number of rows to show in commuters by region table before truncation
const PERCENT_DECIMALS = 2;

// --- Shared Elements --- //

function buildViewHeader(name: string): HTMLDivElement {
  const header = document.createElement('div');
  header.className = 'flex justify-between items-center text-sm font-medium h-8';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'font-medium leading-none';
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
  const renderPanel = () => root.replaceWith(renderCommutersView(gameData, viewState, setDirection));

  const root = document.createElement('div');
  root.className = 'flex flex-col gap-2 text-xs min-h-0';

  const isOutbound = viewState.direction === 'outbound';
  const aggregateModeShare = isOutbound ? commuterData.residentModeShare : commuterData.workerModeShare;
  const byRegionModeShare = isOutbound ? commuterData.residentModeShareByRegion : commuterData.workerModeShareByRegion;
  const populationCount = ModeShare.total(aggregateModeShare);

  root.appendChild(buildCommutersHeader(gameData, viewState, setDirection));
  root.append(...buildSummaryStatistics(populationCount, aggregateModeShare));

  const rows = sortCommuterRows(
    deriveCommuterRows(byRegionModeShare, populationCount, viewState),
    viewState
  );

  const rowsToDisplay = viewState.expanded ? rows.length : DEFAULT_TABLE_ROWS;
  const mayRequireScroll = viewState.expanded && (rows.length > DEFAULT_TABLE_ROWS);

  root.appendChild(buildCommutersTable(viewState, rows, rowsToDisplay, mayRequireScroll, renderPanel));
  return root;
}

function buildCommutersHeader(
  gameData: RegionGameData,
  viewState: CommutersViewState,
  setDirection: (direction: 'outbound' | 'inbound') => void
): HTMLDivElement {
  const header = buildViewHeader(gameData.displayName);
  const directionRow = new SelectRow(
    'commutes-direction',
    [
      { label: 'Residents', onSelect: () => setDirection('outbound') },
      { label: 'Workers', onSelect: () => setDirection('inbound') },
    ],
    viewState.direction === 'outbound' ? 0 : 1
  );
  header.appendChild(directionRow.element);
  return header;
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

function deriveCommuterRows(
  byRegionModeShare: Map<string, ModeShare>,
  populationCount: number,
  viewState: CommutersViewState
): CommuterRowData[] {
  return Array.from(byRegionModeShare.entries()).map(([regionName, modeShare]) => {
    return {
      regionName: regionName,
      commuterValue: viewState.commuterCountDisplay === 'absolute'
        ? ModeShare.total(modeShare)
        : (ModeShare.total(modeShare) / populationCount * 100),
      transitValue: viewState.modeShareDisplay === 'absolute'
        ? modeShare.transit
        : ModeShare.share(modeShare, 'transit') * 100,
      drivingValue: viewState.modeShareDisplay === 'absolute'
        ? modeShare.driving
        : ModeShare.share(modeShare, 'driving') * 100,
      walkingValue: viewState.modeShareDisplay === 'absolute'
        ? modeShare.walking
        : ModeShare.share(modeShare, 'walking') * 100
    };
  });
}

function sortCommuterRows(rows: CommuterRowData[], viewState: CommutersViewState): CommuterRowData[] {
  const applySort = (a: CommuterRowData, b: CommuterRowData, index: number, direction: SortDirection): number => {
    const m = direction === 'asc' ? -1 : 1;
    switch (index) {
      case 1:
        return (b.commuterValue - a.commuterValue) * m; // commuter count
      case 2:
        return (b.transitValue - a.transitValue) * m; // transit commuters
      case 3:
        return (b.drivingValue - a.drivingValue) * m; // driving commuters
      case 4:
        return (b.walkingValue - a.walkingValue) * m; // walking commuters
      default:
        return a.regionName.localeCompare(b.regionName) * m; // region name
    }
  };

  const sorted = [...rows].sort((a, b) => {
    let result = applySort(a, b, viewState.sortIndex, viewState.sortDirection);
    if (result === 0) {
      result = applySort(a, b, viewState.previousSortIndex, viewState.previousSortDirection);
    }
    if (result === 0) {
      result = a.regionName.localeCompare(b.regionName);
    }
    return result;
  });

  return sorted;
}

function buildCommutersTable(
  viewState: CommutersViewState,
  rows: CommuterRowData[],
  rowsToDisplay: number,
  mayRequireScroll: boolean,
  renderPanel: () => void
): HTMLElement {
  const tableFrame = document.createElement('div');
  tableFrame.className = 'border-t border-border/30 pt-1';

  const tableOptions = new TableOptions(getColumnTemplate(viewState), 'standard');
  const tableHeaderData = buildTableHeader(viewState, renderPanel);
  const tableHeader = DataTable(tableOptions, tableHeaderData);
  tableFrame.appendChild(tableHeader);

  const rowsToRender = rows.slice(0, rowsToDisplay);
  const tableBodyData = rowsToRender.map((rowData) => buildTableRow(viewState, rowData));

  const bodyScroll = document.createElement('div');
  bodyScroll.className = 'overflow-y-auto min-h-0';
  bodyScroll.style.maxHeight = '60vh';
  if (mayRequireScroll) {
    bodyScroll.style.scrollbarWidth = 'thin';
    bodyScroll.style.scrollbarGutter = 'stable';
  }

  const tableBody = DataTable(tableOptions, tableBodyData);
  if (mayRequireScroll) tableBody.className += ' pr-2';
  bodyScroll.appendChild(tableBody);
  tableFrame.appendChild(bodyScroll);

  if (rows.length > DEFAULT_TABLE_ROWS) {
    const tableFooter = document.createElement('div');
    tableFooter.className = 'pt-1 flex justify-center';
    tableFooter.appendChild(ExtendButton(
      viewState.expanded ? 'Collapse' : 'Expand',
      rows.length - DEFAULT_TABLE_ROWS,
      () => {
        viewState.expanded = !viewState.expanded;
        renderPanel();
      }));
    tableFrame.appendChild(tableFooter);
  }

  return tableFrame;
}

function getColumnTemplate(viewState: CommutersViewState): string {
  const base = ['minmax(6rem,1fr)', 'minmax(4.5rem,15rem)', 'minmax(4.5rem,15rem)'];

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
      viewState.previousSortIndex = viewState.sortIndex;
      viewState.previousSortDirection = viewState.sortDirection;
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
