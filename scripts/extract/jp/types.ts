import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from 'geojson';

import type {
  ExternalBoundaryFeature,
  ExternalBundleIndexRecord,
} from '../external/types';

export type GeoBoundaryFeature = Feature<Polygon | MultiPolygon>;

export type JPDatasetId = 'shichouson' | 'ooaza';

export type JPBundleIndexRecord = ExternalBundleIndexRecord;

export type JPBoundaryMetadata = {
  boundaryFeature: ExternalBoundaryFeature;
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
