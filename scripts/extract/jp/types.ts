import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from 'geojson';

export type GeoBoundaryFeature = Feature<Polygon | MultiPolygon>;

export type JPDatasetId = 'shichouson' | 'ooaza';

export type JPBundleIndexRecord = {
  bundle_id: string;
  city_code: string;
  boundary_path?: string;
  city_name_en?: string;
  city_name_ja?: string;
  country?: string;
};

export type JPBoundaryMetadata = {
  boundaryFeature: GeoBoundaryFeature;
  municipalityCodes: string[];
  prefCodes: string[];
};

export type JPBundleContext = {
  bundle: JPBundleIndexRecord;
  sourceRoot: string;
  boundaryFeature: GeoBoundaryFeature;
  municipalityCodes: Set<string>;
  prefCodes: string[];
  chochoSelected: FeatureCollection<Polygon | MultiPolygon>;
  municipalityPopulationMap: Map<string, number>;
};

export type OazaBoundaryRow = {
  chochoKey: string;
  kcode1Base: string;
  oazaName: string;
};

export type RegionNameParts = {
  ja: string;
  en: string;
};
