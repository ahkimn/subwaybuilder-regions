import { REGIONS_SETTINGS_STORAGE_KEY } from '../constants';
import { DEFAULT_REGIONS_SETTINGS } from './defaults';
import {
  clone,
  RegionsSettings,
  type RegionsSettings as RegionsSettingsValue,
  resolveSettings as resolveStoredSettings,
} from './types';

type ElectronSettingsApi = {
  getStorageItem?: (key: string) => Promise<unknown>;
  setStorageItem?: (key: string, value: unknown) => Promise<void>;
};

type SettingsListener = (settings: RegionsSettingsValue) => void;

// Class to manage user settings for the Regions mod. Persists settings using the Electron API if available
export class RegionsSettingsStore {
  private settings: RegionsSettingsValue = clone(
    DEFAULT_REGIONS_SETTINGS,
  );
  private initialized = false;
  private readonly listeners = new Set<SettingsListener>();

  constructor(
    private readonly storageKey: string = REGIONS_SETTINGS_STORAGE_KEY,
    private readonly electronApi: ElectronSettingsApi | undefined = window
      .electron as ElectronSettingsApi | undefined,
  ) { }

  async initialize(): Promise<RegionsSettingsValue> {
    if (this.initialized) {
      return this.get();
    }

    this.initialized = true;
    await this.hydrateSettings();
    return this.get();
  }

  get(): RegionsSettingsValue {
    return clone(this.settings);
  }

  listen(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async updateSettings(
    patch: Partial<RegionsSettingsValue>,
  ): Promise<RegionsSettingsValue> {
    const nextSettings: RegionsSettingsValue = {
      ...this.settings,
      ...patch,
    };

    if (RegionsSettings.equals(this.settings, nextSettings)) {
      return this.get();
    }

    this.settings = nextSettings;
    await this.persistToStorage();
    this.emit();
    return this.get();
  }

  private async hydrateSettings(): Promise<void> {
    if (!this.electronApi?.getStorageItem) {
      this.warnMissingElectronAPI('getStorageItem');
      return;
    }

    try {
      const storedValue = await this.electronApi.getStorageItem(this.storageKey);
      if (storedValue == null) {
        return;
      }

      const stored = resolveStoredSettingsPayload(storedValue);
      if (stored === null) {
        console.error(
          `[Regions] Invalid stored settings payload at key ${this.storageKey}; falling back to defaults.`,
          storedValue,
        );
        return;
      }

      this.settings = { ...this.settings, ...stored };
    } catch (error) {
      console.error('[Regions] Failed to load settings from storage.', error);
    }
  }

  // TODO (Game Bug) replace with API storage if possible, as the base Electron storage is game-level and saves to a shared settings.json used by the game
  private async persistToStorage(): Promise<void> {
    if (!this.electronApi?.setStorageItem) {
      this.warnMissingElectronAPI('setStorageItem');
      return;
    }

    try {
      await this.electronApi.setStorageItem(this.storageKey, this.settings);
    } catch (error) {
      console.error('[Regions] Failed to persist settings to storage.', error);
    }
  }

  private emit(): void {
    const snapshot = this.get();
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  private warnMissingElectronAPI(apiMethod: string): void {
    console.warn(
      `[Regions] electron.${apiMethod} is unavailable`,
    );
  }
}

function resolveStoredSettingsPayload(
  storedValue: unknown,
): Partial<RegionsSettingsValue> | null {
  if (isObjectRecord(storedValue) && 'data' in storedValue) {
    return resolveStoredSettings(storedValue.data);
  }
  return resolveStoredSettings(storedValue);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
