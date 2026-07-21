import type { Feature, MultiPolygon, Polygon } from 'geojson';

import type { ExternalBundleContext } from '../external/types';

export type LTDatasetId =
  | 'lt-savivaldybes'
  | 'lt-seniunijos'
  | 'lt-gyvenvietes';
export type LTBundleContext = ExternalBundleContext;
export type LTSourceFeature = Feature<Polygon | MultiPolygon>;

export type LTAdminNameKey = 'savivaldybes' | 'seniunijos';
export type LTAdminNames = Record<LTAdminNameKey, Record<string, string>>;
