import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from 'geojson';

export type ExternalCountryCode = 'JP' | 'CZ';

export type ExternalBundleIndexRecord = {
  bundle_id: string;
  city_code: string;
  boundary_path?: string;
  city_name_en?: string;
  city_name_ja?: string;
  country?: string;
};

export type ExternalBoundaryFeature = Feature<Polygon | MultiPolygon>;

export type ExternalBundleContext = {
  bundle: ExternalBundleIndexRecord;
  sourceRoot: string;
  bundleDir: string;
  boundaryFeature: ExternalBoundaryFeature;
  municipalityCodes: Set<string>;
  prefCodes: string[];
};

export type PolygonFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon
>;
