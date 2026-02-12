import type { BoundaryBox } from '../utils/geometry';

export type DataConfig = {
  displayName: string;
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
