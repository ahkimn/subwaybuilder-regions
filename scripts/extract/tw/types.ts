import type { Feature, MultiPolygon, Polygon } from 'geojson';

import type { BilingualNameParts } from '../bilingual-names';
import type { ExternalBundleContext } from '../external/types';

export type TWDatasetId = 'township' | 'li';

export type TWBundleContext = ExternalBundleContext & {
  municipalityNamesByCode: Map<string, BilingualNameParts>;
  villageEnglishNamesByCode: Map<string, string>;
};

export type TWSourceFeature = Feature<Polygon | MultiPolygon>;
