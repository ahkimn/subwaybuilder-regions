import type React from 'react';
import { type createElement } from 'react';

import type { DatasetTemplateMetadata } from '../../../../shared/datasets/catalog';
import { Button } from '../../elements/Button';
import type { InlineStatusVariant } from '../../elements/InlineStatus';
import { InlineStatus } from '../../elements/InlineStatus';
import { PanelSection } from '../../elements/PanelSection';
import { SelectMenu } from '../../elements/SelectMenu';
import {
  CircleCheck,
  Copy,
  createReactIconElement,
  FolderOpen,
  OctagonX,
} from '../../elements/utils/Icons';
import { getPrimaryChartColorByName } from '../../types/DisplayColor';
import type { FetchParameters } from './fetch-helpers';
import type { SettingsFetchSectionParams } from './types';

const COMMAND_BOX_BASE_CLASS =
  'min-h-[80px] w-full rounded-sm border border-border/40 bg-background/95 backdrop-blur-sm px-2 py-2 text-xs font-mono text-foreground';
const FIELD_HEADER_BASE_CLASS =
  'inline-flex items-center gap-1.5 text-sm font-medium text-foreground leading-none min-h-5';
const ERROR_HEX = getPrimaryChartColorByName('Red').hex;

export function renderFetchDatasetsSection(
  h: typeof createElement,
  params: SettingsFetchSectionParams,
): React.ReactNode {
  const isCityInvalid = !Boolean(params.request.cityCode);
  const isCountryInvalid = params.request.countryCode === null;
  const existsSelectedDatset = params.request.datasetIds.length > 0;
  const isValidCommand =
    !isCityInvalid &&
    !isCountryInvalid &&
    existsSelectedDatset &&
    params.request.bbox !== null &&
    params.errors.length === 0 &&
    !!params.command;

  // List of cities available as per the game state, sorted alphabetically by name.
  const sortedCityOptions = [...params.cityOptions].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  // Show city code alongside name for better clarity (this matches the format used in the registry as well as on disk)
  const cityOptions = sortedCityOptions.map((cityOption) => ({
    value: cityOption.code,
    label: `${cityOption.name} (${cityOption.code})`,
  }));
  // List of all countries available as defined by the static templates
  const countryOptions = params.countryOptions.map((countryCode) => ({
    value: countryCode,
    label: countryCode,
  }));
  // N/A is included when we cannot immediately ascertain what country a city belongs to.
  const countryMenuOptions = [{ value: '', label: 'N/A' }, ...countryOptions];

  return PanelSection(
    h,
    'Fetch Datasets',
    [
      // City / Country selector (single row)
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' }, [
        h('div', { className: 'flex flex-col gap-1.5' }, [
          renderFetchHeader(h, 'City', isCityInvalid, 'Required', 'warning'),
          SelectMenu({
            h,
            value: params.request.cityCode,
            options: cityOptions,
            placeholder: 'Select city',
            onValueChange: params.onCityCodeChange,
          }),
        ]),
        h('div', { className: 'flex flex-col gap-1.5' }, [
          renderFetchHeader(
            h,
            'Country',
            isCountryInvalid,
            'Required',
            'warning',
          ),
          SelectMenu({
            h,
            value: params.request.countryCode ?? '',
            options: countryMenuOptions,
            placeholder: 'N/A',
            disabled: params.isCountryAutoResolved,
            onValueChange: (value) => {
              params.onCountryCodeChange(
                value.length > 0
                  ? (value as FetchParameters['countryCode'])
                  : null,
              );
            },
          }),
        ]),
      ]),

      // Dataset selector
      h('div', { className: 'flex flex-col gap-1.5' }, [
        renderFetchHeader(
          h,
          'Datasets',
          !existsSelectedDatset,
          'Select at least one',
          'warning',
        ),
        renderDatasetOptions(h, params),
      ]),

      // Bounding box display
      h('div', { className: 'flex flex-col gap-1.5' }, [
        h(
          'span',
          { className: 'text-sm font-medium text-foreground' },
          'Boundary Box',
        ),
        h('div', { className: 'flex flex-wrap items-start gap-3 max-w-fit' }, [
          renderBBoxValue(h, 'West', params.request.bbox?.west ?? ''),
          renderBBoxValue(h, 'South', params.request.bbox?.south ?? ''),
          renderBBoxValue(h, 'East', params.request.bbox?.east ?? ''),
          renderBBoxValue(h, 'North', params.request.bbox?.north ?? ''),
        ]),
      ]),

      // Generated command display
      h('div', { className: 'flex flex-col gap-1.5' }, [
        renderFetchHeader(
          h,
          'Generated Command',
          isValidCommand,
          'Ready',
          'success',
        ),
        renderGeneratedCommand(h, isValidCommand, params),
      ]),

      // Action buttons
      renderActionButtons(h, params, isValidCommand),
      h(
        'p',
        { className: 'text-[11px] text-muted-foreground' },
        `Run command from the mods directory after opening it. Command paths target ./${params.relativeModPath}.`,
      ),
    ],
    'flex flex-col gap-3',
  );
}

function renderBBoxValue(
  h: typeof createElement,
  label: string,
  value: string,
): React.ReactNode {
  return h('div', { className: 'flex flex-col gap-0.5' }, [
    h('span', { className: 'text-[11px] text-muted-foreground' }, label),
    h(
      'code',
      {
        className:
          'inline-block w-fit rounded-sm border border-border/40 bg-background/70 px-1.5 py-1 text-[11px]',
      },
      value || 'N/A',
    ),
  ]);
}

// Helper to style a field header with an optional inline status indicator
function renderFetchHeader(
  h: typeof createElement,
  headerText: string,
  statusCondition: boolean,
  statusLabel: string,
  statusType: InlineStatusVariant,
): React.ReactNode {
  return h(
    'label',
    {
      className: FIELD_HEADER_BASE_CLASS,
    },
    [
      headerText,
      statusCondition
        ? InlineStatus({
            h,
            label: statusLabel,
            status: statusType,
          })
        : null,
    ],
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
        // Render each available dataset as a checkbox within the grid
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
  return h(
    'label',
    {
      key: metadata.datasetId,
      className:
        'flex items-center gap-2 rounded-sm border border-border/35 p-1.5 bg-background/60',
    },
    [
      h('input', {
        type: 'checkbox',
        className: 'h-3.5 w-3.5 shrink-0',
        checked: selectedDatasetIds.has(metadata.datasetId),
        onChange: () => params.onToggleDataset(metadata.datasetId),
      }),
      h('div', { className: 'min-w-0 flex-1' }, [
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
      ]),
    ],
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
          className: `${COMMAND_BOX_BASE_CLASS} flex items-center justify-start text-center`,
        },
        h(
          'div',
          {
            className: 'inline-flex items-center gap-1.5 text-xs leading-none',
            style: { color: ERROR_HEX },
          },
          [
            createReactIconElement(h, OctagonX, {
              size: 14,
              className: 'h-3.5 w-3.5 shrink-0',
            }),
            h('span', null, `Command cannot be generated. ${commandErrorText}`),
          ],
        ),
      );
}

function renderActionButtons(
  h: typeof createElement,
  params: SettingsFetchSectionParams,
  canFetch: boolean,
): React.ReactNode {
  return h(
    'div',
    { className: 'flex flex-wrap items-center justify-between gap-2' },
    [
      h('div', { className: 'flex flex-wrap items-center gap-2' }, [
        Button(h, {
          label: 'Copy Command',
          ariaLabel: 'Copy fetch command',
          onClick: params.onCopyCommand,
          disabled: !canFetch,
          icon: Copy,
          iconPlacement: 'start',
          role: 'secondary',
          size: 'xs',
          wrapperClassName: 'w-fit',
          iconOptions: { size: 14, className: 'h-3.5 w-3.5 shrink-0' },
        }),
        Button(h, {
          label: params.isOpeningModsFolder ? 'Opening' : 'Open Mods Folder',
          ariaLabel: 'Open mods folder',
          onClick: params.onOpenModsFolder,
          disabled: params.isOpeningModsFolder,
          icon: FolderOpen,
          iconPlacement: 'start',
          role: 'secondary',
          size: 'xs',
          wrapperClassName: 'w-fit',
          iconOptions: { size: 14, className: 'h-3.5 w-3.5 shrink-0' },
        }),
        Button(h, {
          label: params.isValidatingDatasets
            ? 'Validating'
            : 'Validate Datasets',
          ariaLabel: 'Validate generated datasets',
          onClick: params.onValidateDatasets,
          disabled: !params.canValidateDatasets || params.isValidatingDatasets,
          icon: CircleCheck,
          iconPlacement: 'start',
          role: 'secondary',
          size: 'xs',
          wrapperClassName: 'w-fit',
          iconOptions: { size: 14, className: 'h-3.5 w-3.5 shrink-0' },
        }),
      ]),
      h(
        'div',
        { className: 'min-w-0 text-xs' },
        renderValidationStatus(h, params),
      ),
    ],
  );
}

function renderValidationStatus(
  h: typeof createElement,
  params: SettingsFetchSectionParams,
): React.ReactNode {
  if (params.isValidatingDatasets) {
    return h('div', { className: 'text-xs' }, [
      InlineStatus({
        h,
        status: 'info',
        label: 'Validating generated datasets...',
      }),
    ]);
  }

  if (!params.lastCopiedRequest) {
    return h('div', { className: 'text-xs' }, [
      InlineStatus({
        h,
        status: 'info',
        label: 'Copy a command to enable dataset validation.',
      }),
    ]);
  }

  if (!params.lastValidationResult) {
    return h('div', { className: 'text-xs' }, [
      InlineStatus({
        h,
        status: 'info',
        label: `Ready to validate ${params.lastCopiedRequest.cityCode}: ${params.lastCopiedRequest.datasetIds.join(', ')}`,
      }),
    ]);
  }

  const foundCount = params.lastValidationResult.foundIds.length;
  const missingCount = params.lastValidationResult.missingIds.length;
  const status: InlineStatusVariant =
    missingCount === 0 ? 'success' : 'warning';

  return h('div', { className: 'flex flex-col gap-1 text-xs' }, [
    InlineStatus({
      h,
      status,
      label: `Validated ${params.lastValidationResult.cityCode}: ${foundCount} found, ${missingCount} missing`,
    }),
    missingCount > 0
      ? h(
          'p',
          { className: 'text-[11px] text-muted-foreground' },
          `Missing datasets: ${params.lastValidationResult.missingIds.join(', ')}`,
        )
      : null,
  ]);
}
