import type { DatasetTemplateMetadata } from '@shared/datasets/catalog';
import type React from 'react';
import type { useState } from 'react';

import type { DatasetOrigin } from '@/core/domain';
import type { RegionDatasetRegistry } from '@/core/registry/RegionDatasetRegistry';
import type { RegionsStorage } from '@/core/storage/RegionsStorage';
import type { RegionsSettings } from '@/core/storage/types';
import type { ModdingAPI, SystemPerformanceInfo } from '@/types';

import type {
  InputFieldProperties,
  LabelProperties,
  SortState,
  SwitchProperties,
} from '../types';
import type {
  FetchParameters,
  FetchValidationResult,
  LastCopiedFetchRequest,
} from './fetch-helpers';

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
  fileSizeMB?: number;
  issue: SettingsDatasetIssue;
};

export type SettingsFetchSectionParams = {
  request: FetchParameters;
  errors: string[];
  command: string;
  canValidateDatasets: boolean;
  isValidatingDatasets: boolean;
  isOpeningModsFolder: boolean;
  isCountryAutoResolved: boolean;
  lastCopiedRequest: LastCopiedFetchRequest | null;
  lastValidationResult: FetchValidationResult | null;
  cityOptions: Array<{ code: string; name: string }>;
  countryOptions: Array<NonNullable<FetchParameters['countryCode']>>;
  datasets: DatasetTemplateMetadata[];
  relativeModPath: string;
  onCityCodeChange: (cityCode: string) => void;
  onCountryCodeChange: (countryCode: FetchParameters['countryCode']) => void;
  onToggleDataset: (datasetId: string) => void;
  onCopyCommand: () => void;
  onOpenModsFolder: () => void;
  onValidateDatasets: () => void;
};

export type SettingsFooterSectionParams = {
  systemPerformanceInfo: SystemPerformanceInfo | null;
};

export type GlobalSettingsSectionParams = {
  Switch: React.ComponentType<SwitchProperties>;
  Label: React.ComponentType<LabelProperties>;
  settings: RegionsSettings;
  isUpdating: boolean;
  onToggleShowUnpopulatedRegions: (nextValue: boolean) => void;
};

export type RegistrySectionParams = {
  useStateHook: typeof useState;
  Input: React.ComponentType<InputFieldProperties>;
  rows: SettingsDatasetRow[];
  searchTerm: string;
  sortState: SortState;
  isRefreshingRegistry: boolean;
  isClearingMissing: boolean;
  onSearchTermChange: (searchTerm: string) => void;
  onSortChange: (columnIndex: number) => void;
  onRefreshRegistry: () => void;
  onClearMissing: () => void;
};

export type SettingsOverlayParams = {
  onClose: () => void;
  globalParams: GlobalSettingsSectionParams;
  registryParams: RegistrySectionParams;
  fetchParams: SettingsFetchSectionParams;
  footerParams: SettingsFooterSectionParams;
};
