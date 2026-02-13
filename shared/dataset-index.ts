export type DatasetIndexEntry = {
  datasetId: string;
  displayName: string;
  unitSingular: string;
  unitPlural: string;
  source: string;
  size: number;
};

export type DatasetIndex = Record<string, DatasetIndexEntry[]>;
