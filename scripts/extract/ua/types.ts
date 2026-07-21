import type { Feature, MultiPolygon, Polygon } from 'geojson';

import type { ExternalBundleContext } from '../external/types';

export type UADatasetId = 'ua-raions' | 'ua-hromadas' | 'ua-naseleni-punkty';
export type UABundleContext = ExternalBundleContext;
export type UASourceFeature = Feature<Polygon | MultiPolygon>;
