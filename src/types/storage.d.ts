/** Subway Builder Modding API v1.0.0 */

/**
 * Persistent key-value storage for mod data.
 * @remarks Electron only. In browser, operations are safe no-ops.
 */
export interface ModStorageAPI {
  /** Store a JSON-serializable value. */
  set(key: string, value: unknown): Promise<void>;
  /** Retrieve a stored value, or the default if not found. */
  get<T = unknown>(key: string, defaultValue?: T): Promise<T>;
  /** Delete a stored value. */
  delete(key: string): Promise<void>;
  /** Get all stored keys. */
  keys(): Promise<string[]>;
}
