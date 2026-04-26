import type { ElectronAPI } from '@lib/types/electron';

/**
 * Generic base class for mod settings persistence via the Electron storage API.
 *
 * Subclasses provide their own settings type, defaults, and validation logic.
 * The base class handles hydration, persistence, listener notifications, and
 * the electron read/write wrappers.
 */

export type ModStorageConfig<TSettings> = {
  /** Key used in electron storage. */
  storageKey: string;
  /** Default settings used when nothing is persisted. */
  defaults: TSettings;
  /** Deep-clone a settings snapshot. */
  clone: (settings: TSettings) => TSettings;
  /** Return true when two snapshots are semantically equal. */
  equals: (a: TSettings, b: TSettings) => boolean;
  /** Validate/coerce an unknown stored payload into a partial settings patch. */
  resolveStored: (value: unknown) => Partial<TSettings> | null;
  /** Log prefix for console messages (e.g. "[Regions]"). */
  logPrefix: string;
};

export class ModStorage<TSettings> {
  private settings: TSettings;
  private initialized = false;
  private readonly listeners = new Set<(settings: TSettings) => void>();

  constructor(
    protected readonly config: ModStorageConfig<TSettings>,
    protected readonly electronApi: ElectronAPI = resolveElectronApi(),
  ) {
    this.settings = config.clone(config.defaults);
  }

  async initialize(): Promise<TSettings> {
    if (this.initialized) {
      return this.getSettings();
    }
    this.initialized = true;
    await this.hydrateSettings();
    return this.getSettings();
  }

  getSettings(): TSettings {
    return this.config.clone(this.settings);
  }

  listen(listener: (settings: TSettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async updateSettings(update: Partial<TSettings>): Promise<TSettings> {
    const nextSettings = { ...this.settings, ...update };
    if (this.config.equals(this.settings, nextSettings)) {
      return this.getSettings();
    }
    this.settings = nextSettings;
    await this.persistToStorage();
    this.emit();
    return this.getSettings();
  }

  // --- Electron Storage I/O --- //

  protected async readStorageItem(key: string): Promise<unknown | null> {
    try {
      const result = await this.electronApi.getStorageItem(key);
      if (!result.success) {
        console.error(
          `${this.config.logPrefix} Failed to load storage key ${key}.`,
        );
        return null;
      }
      return result.data;
    } catch (error) {
      console.error(
        `${this.config.logPrefix} Failed to load storage key ${key}.`,
        error,
      );
      return null;
    }
  }

  protected async writeStorageItem(key: string, value: unknown): Promise<void> {
    try {
      const result = await this.electronApi.setStorageItem(key, value);
      if (!result.success) {
        console.error(
          `${this.config.logPrefix} Failed to persist storage key ${key}.`,
        );
      }
    } catch (error) {
      console.error(
        `${this.config.logPrefix} Failed to persist storage key ${key}.`,
        error,
      );
    }
  }

  // --- Internal --- //

  private async hydrateSettings(): Promise<void> {
    const storedValue = await this.readStorageItem(this.config.storageKey);
    if (storedValue == null) {
      return;
    }

    try {
      const stored = this.config.resolveStored(storedValue);
      if (stored === null) {
        console.error(
          `${this.config.logPrefix} Invalid stored settings payload at key ${this.config.storageKey}; falling back to defaults.`,
          storedValue,
        );
        return;
      }
      this.settings = { ...this.settings, ...stored };
    } catch (error) {
      console.error(
        `${this.config.logPrefix} Failed to load settings from storage.`,
        error,
      );
    }
  }

  private async persistToStorage(): Promise<void> {
    await this.writeStorageItem(this.config.storageKey, this.settings);
  }

  protected emit(): void {
    const snapshot = this.getSettings();
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }
}

function resolveElectronApi(): ElectronAPI {
  if (!window.electron) {
    throw new Error('ElectronAPI is unavailable');
  }
  return window.electron as ElectronAPI;
}
