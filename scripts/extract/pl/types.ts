import type { ExternalBundleContext } from '../external/types';

export type PLDatasetId = 'powiat' | 'gmina' | 'rejon';

export type PLBundleContext = ExternalBundleContext;

export type PLGminaRegion = {
  code: string;
  name: string;
  population: number;
  powiatCode: string;
};
