import type { TableCellPaddingClassName } from '../../elements/DataTable';

export const MIN_ROWS_FOR_FULL_HEIGHT = 10;

export const OVERVIEW_HEADER_LABELS = [
  'Region Name',
  'Real Pop',
  'Area (km\u00B2)',
  'Total Commuters',
  'Residents',
  'Workers',
  'Transit (%)',
  'Driving (%)',
  'Walking (%)',
  'Stations',
  'Tracks (km)',
  'Routes',
] as const;

export const OVERVIEW_COLUMN_COUNT = OVERVIEW_HEADER_LABELS.length;
export const OVERVIEW_MIN_COLUMN_PADDING_CH = 2;
export const OVERVIEW_MIN_NON_NAME_COLUMN_CH = 7;
export const OVERVIEW_NON_NAME_COLUMN_PADDING_WIDTH = '0.75rem';

export const OVERVIEW_CELL_PADDING_CLASS_NAMES: TableCellPaddingClassName = {
  left: 'pl-2 pr-1',
  right: 'pl-1 pr-2',
  center: 'px-1.5',
};
