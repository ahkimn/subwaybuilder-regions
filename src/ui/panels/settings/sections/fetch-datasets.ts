import type React from 'react';
import { type createElement } from 'react';

import { REGIONS_ID_ATTR } from '@/core/constants';
import * as SettingsUI from '@/core/constants/ui/settings';

import type { DatasetTemplateMetadata } from '../../../../../shared/datasets/catalog';
import type { ButtonOptions } from '../../../elements/Button';
import { Button } from '../../../elements/Button';
import type { InlineStatusProps, InlineStatusVariant } from '../../../elements/InlineStatus';
import { InlineStatus } from '../../../elements/InlineStatus';
import { PanelSection } from '../../../elements/PanelSection';
import { SelectMenu } from '../../../elements/SelectMenu';
import {
  CircleCheck,
  Copy,
  createReactIconElement,
  FolderOpen,
  OctagonX,
} from '../../../elements/utils/Icons';
import { getPrimaryChartColorByName } from '../../../types/DisplayColor';
import type { FetchParameters } from '../fetch-helpers';
import type { SettingsFetchSectionParams } from '../types';

const COMMAND_BOX_BASE_CLASS =
  'min-h-[80px] w-full rounded-sm border border-border/40 bg-background/95 backdrop-blur-sm px-2 py-2 text-xs font-mono text-foreground';
const FIELD_HEADER_BASE_CLASS =
  'inline-flex items-center gap-1.5 text-sm font-medium text-foreground leading-tight min-h-5';
const FETCH_ICON_SIZE = 14
const FETCH_ICON_CLASS = 'h-3.5 w-3.5 shrink-0';
const FETCH_ICON_PARAMS = { size: FETCH_ICON_SIZE, className: FETCH_ICON_CLASS };
const ERROR_HEX = getPrimaryChartColorByName('Red').hex;

export function renderFetchDatasetsSection(
  h: typeof createElement,
  params: SettingsFetchSectionParams,
): React.ReactNode {
  const isCityInvalid = !Boolean(params.request.cityCode);
  const isCountryInvalid = params.request.countryCode === null;
  const existsSelectedDataset = params.request.datasetIds.length > 0;
  const isValidCommand =
    !isCityInvalid &&
    !isCountryInvalid &&
    existsSelectedDataset &&
    params.request.bbox !== null &&
    params.errors.length === 0 &&
    !!params.command;

  const sortedCityOptions = [...params.cityOptions].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const cityOptions = sortedCityOptions.map((cityOption) => ({
    value: cityOption.code,
    label: `${cityOption.name} (${cityOption.code})`,
  }));
  const countryOptions = params.countryOptions.map((countryCode) => ({
    value: countryCode,
    label: countryCode,
  }));
  const countryMenuOptions = [{ value: '', label: 'N/A' }, ...countryOptions];

  return h(
    'div',
    {
      [REGIONS_ID_ATTR]: SettingsUI.REGIONS_SETTINGS_FETCH_SECTION_ID,
    },
    PanelSection(
      h,
      'Fetch Datasets',
      [
        h(
          'div',
          { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
          wrapFetchField(
            h,
            SettingsUI.REGIONS_SETTINGS_FETCH_CITY_FIELD_ID,
            renderFetchHeader(
              h,
              'City',
              isCityInvalid,
              'Required',
              'warning',
              SettingsUI.REGIONS_SETTINGS_FETCH_CITY_WARNING_ID,
            ),
            SelectMenu({
              h,
              value: params.request.cityCode,
              options: cityOptions,
              placeholder: 'Select city',
              onValueChange: params.onCityCodeChange,
            }),
          ),
          wrapFetchField(
            h,
            SettingsUI.REGIONS_SETTINGS_FETCH_COUNTRY_FIELD_ID,
            renderFetchHeader(
              h,
              'Country',
              isCountryInvalid,
              'Required',
              'warning',
              SettingsUI.REGIONS_SETTINGS_FETCH_COUNTRY_WARNING_ID,
            ),
            SelectMenu({
              h,
              value: params.request.countryCode ?? '',
              options: countryMenuOptions,
              placeholder: 'N/A',
              disabled:
                params.isCountryAutoResolved || !params.request.cityCode,
              onValueChange: (value) => {
                params.onCountryCodeChange(
                  value.length > 0
                    ? (value as FetchParameters['countryCode'])
                    : null,
                );
              },
            }),
          ),
        ),

        // Dataset selection row
        wrapFetchField(
          h,
          SettingsUI.REGIONS_SETTINGS_FETCH_DATASETS_FIELD_ID,
          renderFetchHeader(
            h,
            'Datasets',
            !existsSelectedDataset,
            'Select at least one',
            'warning',
            SettingsUI.REGIONS_SETTINGS_FETCH_DATASETS_WARNING_ID,
          ),
          renderDatasetOptions(h, params),
        ),

        // Auto-generated boundary box fields
        wrapFetchField(
          h,
          SettingsUI.REGIONS_SETTINGS_FETCH_BBOX_FIELD_ID,
          h(
            'span',
            { className: 'text-sm font-medium text-foreground' },
            'Boundary Box',
          ),
          h(
            'div',
            { className: 'flex flex-wrap items-start gap-3 max-w-fit' },
            renderBBoxValue(h, 'West', params.request.bbox?.west ?? ''),
            renderBBoxValue(h, 'South', params.request.bbox?.south ?? ''),
            renderBBoxValue(h, 'East', params.request.bbox?.east ?? ''),
            renderBBoxValue(h, 'North', params.request.bbox?.north ?? ''),
          ),
        ),

        // Generated command field
        wrapFetchField(
          h,
          SettingsUI.REGIONS_SETTINGS_FETCH_COMMAND_FIELD_ID,
          renderFetchHeader(
            h,
            'Generated Command',
            isValidCommand,
            'Ready',
            'success',
          ),
          renderGeneratedCommand(h, isValidCommand, params),
        ),
        // User action buttons + validation status
        renderActionButtons(h, params),
        h(
          'p',
          { className: 'text-[11px] text-muted-foreground' },
          `Run command from the mods directory after opening it. Command paths target ./${params.relativeModPath}.`,
        ),
      ],
      'flex flex-col gap-3',
    ),
  );
}

function wrapFetchField(
  h: typeof createElement,
  regionsId: string,
  ...content: React.ReactNode[]
): React.ReactNode {
  return h(
    'div',
    {
      className: 'flex flex-col gap-1.5',
      [REGIONS_ID_ATTR]: regionsId,
    },
    ...content,
  );
}

function renderBBoxValue(
  h: typeof createElement,
  label: string,
  value: string,
): React.ReactNode {
  return h(
    'div',
    { className: 'flex flex-col gap-0.5' },
    h('span', { className: 'text-[11px] text-muted-foreground' }, label),
    h(
      'code',
      {
        className:
          'inline-block w-fit rounded-sm border border-border/40 bg-background/70 px-1.5 py-1 text-[11px]',
      },
      value || 'N/A',
    ),
  );
}

function renderFetchHeader(
  h: typeof createElement,
  headerText: string,
  statusCondition: boolean,
  statusLabel: string,
  statusType: InlineStatusVariant,
  warningRegionsId?: string,
): React.ReactNode {
  return h(
    'label',
    {
      className: FIELD_HEADER_BASE_CLASS,
    },
    headerText,
    statusCondition
      ? InlineStatus({
        h,
        label: statusLabel,
        status: statusType,
        className: 'inline-flex items-center gap-1 text-xs leading-none',
        iconClassName: FETCH_ICON_CLASS,
        labelClassName: 'leading-none',
        dataRegionsId: warningRegionsId,
      })
      : null,
  );
}

function renderDatasetOptions(
  h: typeof createElement,
  params: SettingsFetchSectionParams,
): React.ReactNode {
  return params.datasets.length === 0
    ? h(
      'p',
      { className: 'text-xs text-muted-foreground' },
      'No fetchable datasets available for the selected city/country.',
    )
    : h(
      'div',
      {
        className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5',
      },
      params.datasets.map((metadata) =>
        renderDatasetOption(h, metadata, params),
      ),
    );
}

function renderDatasetOption(
  h: typeof createElement,
  metadata: DatasetTemplateMetadata,
  params: SettingsFetchSectionParams,
): React.ReactNode {
  const selectedDatasetIds = new Set(params.request.datasetIds);
  const isSelected = selectedDatasetIds.has(metadata.datasetId);
  const datasetCardClassName = [
    'group flex w-full items-center justify-between gap-2 rounded-sm border px-2 py-1.5 text-left transition-colors',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60',
    isSelected
      ? 'border-primary/50 bg-primary/10'
      : 'border-border/35 bg-background/60 hover:bg-accent/40 hover:border-border/60',
  ].join(' ');

  return h(
    'button',
    {
      key: metadata.datasetId,
      type: 'button',
      className: datasetCardClassName,
      'aria-pressed': isSelected,
      [REGIONS_ID_ATTR]:
        SettingsUI.regionsFetchDatasetCardId(metadata.datasetId),
      onClick: () => params.onToggleDataset(metadata.datasetId),
    },
    h(
      'div',
      { className: 'min-w-0 flex-1' },
      h(
        'span',
        { className: 'text-xs font-medium truncate' },
        metadata.displayName,
      ),
      h(
        'p',
        {
          className: 'text-[11px] text-muted-foreground truncate',
        },
        metadata.source,
      ),
    ),
    isSelected
      ? createReactIconElement(h, CircleCheck, {
        size: 14,
        className: 'h-3.5 w-3.5 shrink-0 text-primary',
      })
      : null,
  );
}

function renderGeneratedCommand(
  h: typeof createElement,
  isValidCommand: boolean,
  params: SettingsFetchSectionParams,
): React.ReactNode {
  const commandErrorText =
    params.errors[0] ??
    'Command cannot be generated. Please complete required fields.';

  return isValidCommand
    ? h(
      'div',
      { className: COMMAND_BOX_BASE_CLASS },
      h(
        'pre',
        {
          className: 'm-0 whitespace-pre-wrap break-all select-text',
        },
        params.command,
      ),
    )
    : h(
      'div',
      {
        [REGIONS_ID_ATTR]: SettingsUI.REGIONS_SETTINGS_FETCH_COMMAND_WARNING_ID,
        className: `${COMMAND_BOX_BASE_CLASS} flex items-center justify-start text-center`,
      },
      h(
        'div',
        {
          className: 'inline-flex items-center gap-1.5 text-xs leading-none',
          style: { color: ERROR_HEX },
        },
        createReactIconElement(h, OctagonX, FETCH_ICON_PARAMS),
        h('span', null, `Command cannot be generated. ${commandErrorText}`),
      ),
    );
}

function renderActionButtons(
  h: typeof createElement,
  params: SettingsFetchSectionParams,
): React.ReactNode {
  const sharedClassNames = {
    iconPlacement: 'start',
    role: 'secondary',
    size: 'xs',
    wrapperClassName: 'w-fit',
    iconOptions: FETCH_ICON_PARAMS,
  } satisfies Pick<
    ButtonOptions,
    'iconPlacement' | 'role' | 'size' | 'wrapperClassName' | 'iconOptions'
  >;
  return h(
    'div',
    { className: 'flex flex-wrap items-start justify-between gap-2' },
    h(
      'div',
      { className: 'flex flex-wrap items-center gap-2' },
      Button(h, {
        label: 'Copy Command',
        ariaLabel: 'Copy fetch command',
        onClick: params.onCopyCommand,
        disabled: !params.canCopyCommand,
        icon: Copy,
        ...sharedClassNames,
        dataRegionsId: SettingsUI.REGIONS_SETTINGS_FETCH_COPY_BUTTON_ID,
      }),
      Button(h, {
        label: params.isOpeningModsFolder ? 'Opening' : 'Open Mods Folder',
        ariaLabel: 'Open mods folder',
        onClick: params.onOpenModsFolder,
        disabled: !params.canOpenModsFolder || params.isOpeningModsFolder,
        icon: FolderOpen,
        ...sharedClassNames,
        dataRegionsId: SettingsUI.REGIONS_SETTINGS_FETCH_OPEN_MOD_FOLDER_BUTTON_ID,
      }),
      Button(h, {
        label: params.isValidatingDatasets ? 'Validating' : 'Validate Datasets',
        ariaLabel: 'Validate generated datasets',
        onClick: params.onValidateDatasets,
        disabled: !params.canValidateDatasets || params.isValidatingDatasets,
        icon: CircleCheck,
        ...sharedClassNames,
        dataRegionsId: SettingsUI.REGIONS_SETTINGS_FETCH_VALIDATE_BUTTON_ID,
      }),
    ),
    h(
      'div',
      {
        className: 'min-w-0 text-xs',
        [REGIONS_ID_ATTR]: SettingsUI.REGIONS_SETTINGS_FETCH_STATUS_ID,
      },
      renderValidationStatus(h, params),
    ),
  );
}


function validationTextWrapper(h: typeof createElement, status: InlineStatusVariant, label: string, wrapperClass?: string): React.ReactNode {
  const baseValidationParams = {
    className: 'inline-flex items-center gap-1 text-xs leading-none',
    iconClassName: FETCH_ICON_CLASS,
    labelClassName: 'leading-none',
  } satisfies Pick<InlineStatusProps, 'className' | 'iconClassName' | 'labelClassName'>;

  return h(
    'div',
    { className: wrapperClass },
    InlineStatus({
      h,
      status,
      label,
      ...baseValidationParams,
    }),
  );
}


function renderValidationStatus(
  h: typeof createElement,
  params: SettingsFetchSectionParams,
): React.ReactNode {

  if (params.isValidatingDatasets) {
    return validationTextWrapper(h, 'info', 'Validating generated datasets...');
  } else if (!params.lastCopiedRequest) {
    return validationTextWrapper(h, 'info', 'Copy a command to enable opening mods folder.');
  } else if (!params.canValidateDatasets) {
    return validationTextWrapper(h, 'info', 'Open mods folder to enable dataset validation.');
  } else if (!params.lastValidationResult) {
    return validationTextWrapper(h, 'info', `Ready to validate ${params.lastCopiedRequest.cityCode}: ${params.lastCopiedRequest.datasetIds.join(', ')}`);
  } else {

    const foundCount = params.lastValidationResult.foundIds.length;
    const missingCount = params.lastValidationResult.missingIds.length;
    const status: InlineStatusVariant =
      missingCount === 0 ? 'success' : 'warning';

    const subDiv = missingCount > 0
      ? h(
        'p',
        { className: 'text-[11px] text-muted-foreground' },
        `Missing datasets: ${params.lastValidationResult.missingIds.join(', ')}`,
      )
      : null

    return [subDiv, validationTextWrapper(
      h,
      status,
      `Validated ${params.lastValidationResult.cityCode}: ${foundCount} found, ${missingCount} missing`,
      'flex flex-col gap-1',
    ),
    ];
  }
}
