import { parseNumber } from '../../utils/cli';
import {
  HU_NAME_PROPERTY,
  HU_POPULATION_PROPERTY,
  HU_SOURCE_ID_PROPERTY,
} from './constants';
import { loadHUJarasSelected, loadHUTelepulesSelected } from './context';
import type { HUBundleContext, HUSourceFeature } from './types';

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function withProperties(
  feature: HUSourceFeature,
  id: string,
  name: string,
  pop: number,
): HUSourceFeature {
  return {
    ...feature,
    properties: {
      ...(feature.properties ?? {}),
      [HU_SOURCE_ID_PROPERTY]: id,
      [HU_NAME_PROPERTY]: name || id,
      [HU_POPULATION_PROPERTY]: pop,
    },
  };
}

export function buildHUJarasSourceCollection(context: HUBundleContext) {
  return {
    type: 'FeatureCollection' as const,
    features: loadHUJarasSelected(context).features.map((feature) =>
      withProperties(
        feature,
        text(feature.properties?.jaras_id),
        text(feature.properties?.jaras_name),
        parseNumber(feature.properties?.pop_total) ?? 0,
      ),
    ),
  };
}

export function buildHUTelepulesSourceCollection(context: HUBundleContext) {
  return {
    type: 'FeatureCollection' as const,
    features: loadHUTelepulesSelected(context).features.map((feature) =>
      withProperties(
        feature,
        text(feature.properties?.telepules_code),
        text(feature.properties?.telepules_name),
        parseNumber(feature.properties?.pop_total) ?? 0,
      ),
    ),
  };
}
