import type React from 'react';
import { type createElement } from 'react';

import { Button } from '../../elements/Button';
import { InlineStatus } from '../../elements/InlineStatus';
import { PanelSection } from '../../elements/PanelSection';
import { SelectMenu } from '../../elements/SelectMenu';
import {
  Copy,
  createReactIconElement,
  FolderOpen,
  OctagonX,
} from '../../elements/utils/Icons';
import { getPrimaryChartColorByName } from '../../types/DisplayColor';
import type { FetchParameters } from './fetch-helpers';
import { renderSystemPerformanceFooter } from './render-footer';
import type { SettingsFetchSectionParams } from './types';

const COMMAND_BOX_BASE_CLASS =
  'min-h-[80px] w-full rounded-sm border border-border/40 bg-background/95 backdrop-blur-sm px-2 py-2 text-xs font-mono text-foreground';
const FIELD_HEADER_BASE_CLASS = 'inline-flex items-center gap-1.5 text-sm font-medium text-foreground leading-none min-h-5'
const ERROR_HEX = getPrimaryChartColorByName('Red').hex;

export function renderFetchDatasetsSection(
  h: typeof createElement,
  params: SettingsFetchSectionParams,
): React.ReactNode {
  const isCityInvalid = !Boolean(params.fetchParams.cityCode);
  const isCountryInvalid = params.fetchParams.countryCode === null;
  const existsSelectedDatset = params.fetchParams.datasetIds.length > 0;
  const selectedDatasetIds = new Set(params.fetchParams.datasetIds);
  const isValidCommand =
    !isCityInvalid &&
    !isCountryInvalid &&
    existsSelectedDatset &&
    params.fetchParams.bbox !== null &&
    params.errors.length === 0 &&
    !!params.command;
  const commandErrorText =
    params.errors[0] ??
    'Command cannot be generated. Please complete required fields.';
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

  return PanelSection(
    h,
    'Fetch Datasets',
    [
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' }, [
        h('div', { className: 'flex flex-col gap-1.5' }, [
          h(
            'label',
            {
              className: FIELD_HEADER_BASE_CLASS,
            },
            [
              'City',
              isCityInvalid
                ? InlineStatus({
                  h,
                  label: 'Required',
                  status: 'warning',
                })
                : null,
            ],
          ),
          SelectMenu({
            h,
            value: params.fetchParams.cityCode,
            options: cityOptions,
            placeholder: 'Select city',
            onValueChange: params.onCityCodeChange,
          }),
        ]),
        h('div', { className: 'flex flex-col gap-1.5' }, [
          h(
            'label',
            {
              className: FIELD_HEADER_BASE_CLASS,

            },
            [
              'Country Code',
              isCountryInvalid
                ? InlineStatus({
                  h,
                  label: 'Required',
                  status: 'warning',
                })
                : null,
            ],
          ),
          SelectMenu({
            h,
            value: params.fetchParams.countryCode ?? '',
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
      h('div', { className: 'flex flex-col gap-2' }, [
        h(
          'span',
          {
            className: FIELD_HEADER_BASE_CLASS,
          },
          [
            'Datasets',
            !existsSelectedDatset
              ? InlineStatus({
                h,
                label: 'Required',
                status: 'warning',
              })
              : null,
          ],
        ),
        params.datasets.length === 0
          ? h(
            'p',
            { className: 'text-xs text-muted-foreground' },
            'No fetchable datasets available for the selected city/country.',
          )
          : h(
            'div',
            {
              className:
                'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5',
            },
            params.datasets.map((dataset) =>
              h(
                'label',
                {
                  key: dataset.datasetId,
                  className:
                    'flex items-center gap-2 rounded-sm border border-border/35 p-1.5 bg-background/60',
                },
                [
                  h('input', {
                    type: 'checkbox',
                    className: 'h-3.5 w-3.5 shrink-0',
                    checked: selectedDatasetIds.has(dataset.datasetId),
                    onChange: () => params.onToggleDataset(dataset.datasetId),
                  }),
                  h('div', { className: 'min-w-0 flex-1' }, [
                    h(
                      'span',
                      { className: 'text-xs font-medium truncate' },
                      dataset.displayName,
                    ),
                    h(
                      'p',
                      {
                        className:
                          'text-[11px] text-muted-foreground truncate',
                      },
                      dataset.source,
                    ),
                  ]),
                ],
              ),
            ),
          ),
      ]),
      h('div', { className: 'flex flex-col gap-1.5' }, [
        h(
          'span',
          { className: 'text-sm font-medium text-foreground' },
          'Boundary Box',
        ),
        h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-1.5' }, [
          renderBBoxValue(h, 'West', params.fetchParams.bbox?.west ?? ''),
          renderBBoxValue(h, 'South', params.fetchParams.bbox?.south ?? ''),
          renderBBoxValue(h, 'East', params.fetchParams.bbox?.east ?? ''),
          renderBBoxValue(h, 'North', params.fetchParams.bbox?.north ?? ''),
        ]),
      ]),
      h('div', { className: 'flex flex-col gap-1.5' }, [
        h(
          'label',
          {
            className: FIELD_HEADER_BASE_CLASS,
          },
          [
            'Generated Command',
            isValidCommand
              ? InlineStatus({
                h,
                label: 'Ready',
                status: 'success',
              })
              : null,
          ],
        ),
        !isValidCommand
          ? h(
            'div',
            {
              className: `${COMMAND_BOX_BASE_CLASS} border-red-500/40 flex items-center justify-start text-center`,
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
                h(
                  'span',
                  null,
                  `Command cannot be generated. ${commandErrorText}`,
                ),
              ],
            ),
          )
          : h(
            'div',
            { className: COMMAND_BOX_BASE_CLASS },
            h(
              'pre',
              {
                className: 'm-0 whitespace-pre-wrap break-all select-text',
              },
              params.command,
            ),
          ),
      ]),
      renderFetchButtons(h, params, isValidCommand),
      h(
        'p',
        { className: 'text-[11px] text-muted-foreground' },
        `Run command from the mods directory after opening it. Command paths target ./${params.relativeModPath}.`,
      ),
      renderSystemPerformanceFooter(h, params.systemPerformanceInfo),
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

function renderFetchButtons(
  h: typeof createElement,
  params: SettingsFetchSectionParams,
  canFetch: boolean
): React.ReactNode {
  return h('div', { className: 'flex flex-wrap items-center gap-2' }, [
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
  ])
}
