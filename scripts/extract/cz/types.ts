import type { ExternalBundleContext } from '../external/types';

export type CZDatasetId = 'okres' | 'obce' | 'zsj';

export type CZBundleContext = ExternalBundleContext;

export type CZObecRegion = {
  code: string;
  name: string;
  population: number;
};

export type CZZsjDilNameRow = {
  chochoKey: string;
  name: string;
};
