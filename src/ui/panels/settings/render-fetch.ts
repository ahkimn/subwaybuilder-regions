import type React from 'react';
import { type createElement } from 'react';

import { Button } from '../../elements/Button';
import { PanelSection } from '../../elements/PanelSection';
import { SelectMenu } from '../../elements/SelectMenu';
import {
  CircleCheck,
  Copy,
  createReactIconElement,
  type IconDefinition,
  MapPinnedIcon,
  OctagonX,
  TriangleWarning,
} from '../../elements/utils/Icons';
import { getPrimaryChartColorByName } from '../../types/DisplayColor';
import type { FetchParameters } from './fetch-helpers';
import { renderSystemPerformanceFooter } from './render-footer';
import type { SettingsFetchSectionParams } from './types';

const WARNING_HEX = getPrimaryChartColorByName('Amber').hex;
const CRITICAL_HEX = getPrimaryChartColorByName('Red').hex;
const SUCCESS_HEX = getPrimaryChartColorByName('Green').hex;
const INLINE_STATUS_TEXT_CLASS =
  'ml-2 inline-flex items-center gap-1 text-xs font-normal leading-none align-middle';
const INLINE_STATUS_ICON_CLASS = 'h-3.5 w-3.5 shrink-0';

export function renderFetchDatasetsSection(
  h: typeof createElement,
  params: SettingsFetchSectionParams,
): React.ReactNode {
  const selectedDatasetIds = new Set(params.params.datasetIds);
  const canGenerateCommand = params.errors.length === 0 && !!params.command;
  const isCityInvalid = params.params.cityCode.length === 0;
  const isCountryInvalid = params.params.countryCode.length === 0;
  const areDatasetsInvalid = params.params.datasetIds.length === 0;
  const isCommandInvalid = !canGenerateCommand;
  const commandErrorText =
    params.errors[0] ?? 'Command cannot be generated. Please complete required fields.';
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

  return PanelSection(
    h,
    'Fetch Datasets',
    [
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' }, [
        h('div', { className: 'flex flex-col gap-1.5' }, [
          h(
            'label',
            { className: 'inline-flex items-center gap-1.5 text-sm font-medium text-foreground leading-none min-h-5' },
            [
              'City',
              isCityInvalid
                ? renderInlineWarningLabel(h, 'Required', WARNING_HEX)
                : null,
            ],
          ),
          SelectMenu({
            h,
            value: params.params.cityCode,
            options: cityOptions,
            placeholder: 'Select city',
            onValueChange: params.onCityCodeChange,
          }),
        ]),
        h('div', { className: 'flex flex-col gap-1.5' }, [
          h(
            'label',
            { className: 'inline-flex items-center gap-1.5 text-sm font-medium text-foreground leading-none min-h-5' },
            [
              'Resolved Country',
              isCountryInvalid
                ? renderInlineWarningLabel(h, 'Required', WARNING_HEX)
                : null,
            ],
          ),
          SelectMenu({
            h,
            value: params.params.countryCode,
            options: countryOptions,
            placeholder: 'N/A',
            disabled: params.isCountryAutoResolved,
            onValueChange: (value) => {
              params.onCountryCodeChange(value as FetchParameters['countryCode']);
            },
          }),
        ]),
      ]),
      h('div', { className: 'flex flex-col gap-2' }, [
        h(
          'span',
          { className: 'inline-flex items-center gap-1.5 text-sm font-medium text-foreground leading-none min-h-5' },
          [
            'Datasets',
            areDatasetsInvalid
              ? renderInlineWarningLabel(
                h,
                'At least one must be selected',
                WARNING_HEX,
              )
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
            { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5' },
            params.datasets.map((dataset) =>
              h(
                'label',
                {
                  key: dataset.datasetId,
                  className:
                    'flex items-center gap-2 rounded-sm border border-border/35 p-2 bg-background/60',
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
                      { className: 'text-[11px] text-muted-foreground truncate' },
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
          renderBBoxValue(h, 'West', params.params.west),
          renderBBoxValue(h, 'South', params.params.south),
          renderBBoxValue(h, 'East', params.params.east),
          renderBBoxValue(h, 'North', params.params.north),
        ]),
      ]),
      h('div', { className: 'flex flex-col gap-1.5' }, [
        h(
          'label',
          { className: 'inline-flex items-center gap-1.5 text-sm font-medium text-foreground leading-none min-h-5' },
          [
            'Generated Command',
            isCommandInvalid
              ? renderInlineStatusLabel(
                h,
                'Required',
                CRITICAL_HEX,
                OctagonX,
              )
              : renderInlineStatusLabel(
                h,
                'Ready',
                SUCCESS_HEX,
                CircleCheck,
              ),
          ],
        ),
        isCommandInvalid
          ? h(
            'div',
            {
              className:
                'min-h-[80px] w-full rounded-sm border border-red-500/40 bg-background/70 px-2 py-1 text-xs font-mono',
            },
            h(
              'div',
              {
                className: 'inline-flex items-center gap-1.5 text-xs leading-none',
                style: { color: CRITICAL_HEX },
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
          : h('textarea', {
            className:
              'min-h-[80px] w-full rounded-sm border border-border/40 bg-background/70 px-2 py-1 text-xs font-mono text-foreground',
            readOnly: true,
            value: params.command,
          }),
      ]),
      h('div', { className: 'flex flex-wrap items-center gap-2' }, [
        Button(h, {
          label: params.isCopying ? 'Copying' : 'Copy Command',
          ariaLabel: 'Copy fetch command',
          onClick: params.onCopyCommand,
          disabled: !canGenerateCommand || params.isCopying,
          icon: Copy,
          iconPlacement: 'start',
          wrapperClassName: 'w-fit',
          buttonClassName:
            'inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm border border-border/40 bg-background/70 hover:bg-accent transition-colors',
          iconOptions: { size: 14, className: 'h-3.5 w-3.5 shrink-0' },
        }),
        Button(h, {
          label: params.isOpeningModsFolder ? 'Opening' : 'Open Mods Folder',
          ariaLabel: 'Open mods folder',
          onClick: params.onOpenModsFolder,
          disabled: params.isOpeningModsFolder,
          icon: MapPinnedIcon,
          iconPlacement: 'start',
          wrapperClassName: 'w-fit',
          buttonClassName:
            'inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm border border-border/40 bg-background/70 hover:bg-accent transition-colors',
          iconOptions: { size: 14, className: 'h-3.5 w-3.5 shrink-0' },
        }),
      ]),
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

function renderInlineWarningLabel(
  h: typeof createElement,
  label: string,
  colorHex: string,
): React.ReactNode {
  return renderInlineStatusLabel(h, label, colorHex, TriangleWarning);
}

function renderInlineStatusLabel(
  h: typeof createElement,
  label: string,
  colorHex: string,
  icon: IconDefinition,
): React.ReactNode {
  return h(
    'span',
    {
      className: INLINE_STATUS_TEXT_CLASS,
      style: { color: colorHex },
    },
    [
      createReactIconElement(h, icon, {
        size: 14,
        className: INLINE_STATUS_ICON_CLASS,
      }),
      h('span', null, label),
    ],
  );
}
