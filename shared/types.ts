export type Primitive = string | number | boolean | null | undefined;
export type AllPrimitives<T> = {
  [K in keyof T]: T[K] extends Primitive ? T[K] : never;
};
