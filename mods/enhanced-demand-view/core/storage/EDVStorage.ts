import { ModStorage } from '@lib/storage/ModStorage';

import { EDV_SETTINGS_STORAGE_KEY } from '../constants';
import { DEFAULT_EDV_SETTINGS } from './settings';
import {
  clone,
  EDVSettings,
  type EDVSettings as EDVSettingsValue,
  resolveSettings,
} from './types';

/**
 * Storage class for the Enhanced Demand View mod.
 *
 * Lightweight — only manages settings persistence via the base ModStorage class.
 */
export class EDVStorage extends ModStorage<EDVSettingsValue> {
  constructor() {
    super({
      storageKey: EDV_SETTINGS_STORAGE_KEY,
      defaults: DEFAULT_EDV_SETTINGS,
      clone,
      equals: EDVSettings.equals,
      resolveStored: resolveSettings,
      logPrefix: '[EnhancedDemandView]',
    });
  }
}
