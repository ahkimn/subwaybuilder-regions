import type { DatasetTemplateMetadata } from '@shared/datasets/catalog';

import type { DatasetOrigin } from '@/core/domain';
import type { RegionsSettings } from '@/core/storage/types';
import type { ModdingAPI, SystemPerformanceInfo } from '@/types';

import type { RegionDatasetRegistry } from '../../../core/registry/RegionDatasetRegistry';
import type { RegionsStorage } from '../../../core/storage/RegionsStorage';
import type {
  InputFieldProperties,
  LabelProperties,
  SortState,
  SwitchProperties,
} from '../types';
import type { FetchParameters } from './fetch-helpers';


export type SettingsMenuComponentParams = {
  api: ModdingAPI;
  storage: RegionsStorage;
  datasetRegistry: RegionDatasetRegistry;
};

export type SettingsDatasetIssue = 'missing_file' | 'missing_city' | null;

export type SettingsDatasetRow = {
  rowKey: string;
  cityCode: string;
  cityName: string | null;
  datasetId: string;
  displayName: string;
  origin: DatasetOrigin;
  fileSizeMB: number | null;
  issue: SettingsDatasetIssue;
};

export type SettingsFetchSectionParams = {
  params: FetchParameters;
  errors: string[];
  command: string;
  isCopying: boolean;
  isOpeningModsFolder: boolean;
  isCountryAutoResolved: boolean;
  cityOptions: Array<{ code: string; name: string }>;
  countryOptions: Array<Exclude<FetchParameters['countryCode'], ''>>;
  datasets: DatasetTemplateMetadata[];
  relativeModPath: string;
  systemPerformanceInfo: SystemPerformanceInfo | null;
  onCityCodeChange: (cityCode: string) => void;
  onCountryCodeChange: (countryCode: FetchParameters['countryCode']) => void;
  onToggleDataset: (datasetId: string) => void;
  onCopyCommand: () => void;
  onOpenModsFolder: () => void;
};

export type GlobalSettingsSectionParams = {
  settings: RegionsSettings;
  isUpdating: boolean;
  onToggleShowUnpopulatedRegions: (nextValue: boolean) => void;
};

export type RegistrySectionParams = {
  rows: SettingsDatasetRow[];
  searchTerm: string;
  sortState: SortState;
  onSearchTermChange: (searchTerm: string) => void;
  onSortChange: (columnIndex: number) => void;
  onRefreshRegistry: () => void;
  isRefreshingRegistry: boolean;
  onClearMissing: () => void;
  isClearingMissing: boolean;
};

export type SettingsOverlayParams = {
  settings: RegionsSettings;
  isUpdating: boolean;
  searchTerm: string;
  sortState: SortState;
  rows: SettingsDatasetRow[];
  onClose: () => void;
  onSearchTermChange: (searchTerm: string) => void;
  onSortChange: (columnIndex: number) => void;
  onToggleShowUnpopulatedRegions: (nextValue: boolean) => void;
  onRefreshRegistry: () => void;
  isRefreshingRegistry: boolean;
  onClearMissing: () => void;
  isClearingMissing: boolean;
  fetch: SettingsFetchSectionParams;
  Input: React.ComponentType<InputFieldProperties>;
  Switch: React.ComponentType<SwitchProperties>;
  Label: React.ComponentType<LabelProperties>;
};

