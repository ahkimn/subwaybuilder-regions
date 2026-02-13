import type { BoundaryBox } from '../utils/geometry';

export type DataConfig = {
  datasetId: string;
  displayName: string;
  unitSingular: string;
  unitPlural: string;
  source: string;
  idProperty: string;
  nameProperty: string;
  applicableNameProperties: string[];
  populationProperty?: string;
  unitTypeProperty?: string;
};

export type BoundaryDataHandler = {
  dataConfig: DataConfig;
  extractBoundaries(
    bbox: BoundaryBox,
    useLocalData?: boolean,
  ): Promise<{
    geoJson: GeoJSON.FeatureCollection;
    populationMap?: Map<string, string>;
  }>;
};
