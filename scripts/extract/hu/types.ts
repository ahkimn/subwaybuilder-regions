import type { Feature, MultiPolygon, Polygon } from 'geojson';

import type { ExternalBundleContext } from '../external/types';

export type HUDatasetId = 'hu-jaras' | 'hu-telepulesek';
export type HUBundleContext = ExternalBundleContext;
export type HUSourceFeature = Feature<Polygon | MultiPolygon>;
