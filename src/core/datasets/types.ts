
export const SOURCE_PREFIX = 'regions-src';
export const LAYER_PREFIX = 'regions-layer';

export type BoundaryBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type DatasetSource = {
  type: 'static' | 'user';
  dataPath: string; // relative path of Dataset from mod serve or user data directory
  writable: boolean; // whether or not the data can be overwritten by the user
}