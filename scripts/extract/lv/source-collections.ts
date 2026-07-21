import { parseNumber } from '../../utils/cli';
import {
  LV_NAME_PROPERTY,
  LV_POPULATION_PROPERTY,
  LV_SOURCE_ID_PROPERTY,
} from './constants';
import {
  loadLVChochoSelected,
  loadLVMunicipalitiesSelected,
  loadLVSubMunicipalSelected,
} from './context';
import type { LVBundleContext, LVSourceFeature } from './types';

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function population(properties: GeoJSON.GeoJsonProperties): number {
  return parseNumber(properties?.pop_total) ?? 0;
}

function withProperties(
  feature: LVSourceFeature,
  id: string,
  name: string,
  pop: number,
): LVSourceFeature {
  return {
    ...feature,
    properties: {
      ...(feature.properties ?? {}),
      [LV_SOURCE_ID_PROPERTY]: id,
      [LV_NAME_PROPERTY]: name || id,
      [LV_POPULATION_PROPERTY]: pop,
    },
  };
}

// Fully-tiling sub-municipal admin grain: apkaimes (in-city) + pilsētas /
// pagasti (elsewhere), from jp-data's DPA-free sub_municipal_selected layer.
export function buildLVApkaimesSourceCollection(context: LVBundleContext) {
  return {
    type: 'FeatureCollection' as const,
    features: loadLVSubMunicipalSelected(context).features.map((feature) =>
      withProperties(
        feature,
        text(feature.properties?.code),
        text(feature.properties?.name),
        parseNumber(feature.properties?.pop_total) ?? 0,
      ),
    ),
  };
}

// LGU (novadi + valstspilsētas) polygons come from the municipality layer, but
// carry no population; population is summed from the chocho layer via parent_lgu.
export function buildLVPasvaldibasSourceCollection(context: LVBundleContext) {
  const populationByLgu = new Map<string, number>();
  for (const feature of loadLVChochoSelected(context).features) {
    const lgu = text(feature.properties?.parent_lgu);
    populationByLgu.set(
      lgu,
      (populationByLgu.get(lgu) ?? 0) + population(feature.properties),
    );
  }
  return {
    type: 'FeatureCollection' as const,
    features: loadLVMunicipalitiesSelected(context).features.map((feature) => {
      const id = text(feature.properties?.lgu_atvk);
      return withProperties(
        feature,
        id,
        text(feature.properties?.nosaukums),
        populationByLgu.get(id) ?? 0,
      );
    }),
  };
}
