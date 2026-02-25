import { DEFAULT_REGIONS_SETTINGS } from '@/core/storage/settings';
import type { RegionsSettings } from '@/core/storage/types';
import type { LightMode } from '@/map/styles';

import type { RegionSelection } from './selection';

export type UIStyle = {
  lightMode: LightMode;
};

export class UIState {
  cityCode: string | null = null;
  lastInjectedCity: string | null = null;
  activeSelection: RegionSelection | null = null;
  style: UIStyle = { lightMode: 'dark' };
  settings: RegionsSettings = { ...DEFAULT_REGIONS_SETTINGS };

  get isActive(): boolean {
    return this.cityCode !== null && this.activeSelection !== null;
  }
}
