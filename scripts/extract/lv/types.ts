import type { Feature, MultiPolygon, Polygon } from 'geojson';

import type { ExternalBundleContext } from '../external/types';

export type LVDatasetId = 'lv-pasvaldibas' | 'lv-apkaimes';
export type LVBundleContext = ExternalBundleContext;
export type LVSourceFeature = Feature<Polygon | MultiPolygon>;
