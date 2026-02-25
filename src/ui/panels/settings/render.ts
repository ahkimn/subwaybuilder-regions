import type React from 'react';
import type { createElement, useState } from 'react';

import { Button } from '../../elements/Button';
import { ReactDivider } from '../../elements/Divider';
import { Arrow, MapPinnedIcon } from '../../elements/utils/Icons';
import type {
  InputFieldProperties,
  LabelProperties,
  SwitchProperties,
} from '../types';
import { renderFetchDatasetsSection } from './render-fetch';
import { renderSystemPerformanceFooter } from './render-footer';
import { renderGlobalSettingsSection } from './render-global-settings';
import { renderDatasetRegistrySection } from './render-registry';
import type { SettingsOverlayParams } from './types';

export {
  filterSettingsRows,
  resolveRegistrySortConfig,
  sortSettingsRows,
} from './render-registry';
export type { SettingsDatasetRow } from './types';

export function renderSettingsEntry(
  h: typeof createElement,
  onOpen: () => void,
): React.ReactNode {
  return h('div', { key: 'entry', className: 'flex flex-col gap-1' }, [
    Button(h, {
      label: 'Regions',
      ariaLabel: 'Open Regions Settings',
      onClick: onOpen,
      icon: MapPinnedIcon,
      iconPlacement: 'start',
      wrapperClassName: 'w-full',
      buttonClassName:
        'max-w-full font-bold group flex items-center bg-primary text-primary-foreground cursor-pointer ' +
        'justify-start gap-1.5 w-full h-9 hover:bg-primary/90 transition-colors rounded-none px-1',
      labelClassName: 'h-full text-3xl',
      iconOptions: {
        size: 20,
        className:
          'min-w-fit transition-all duration-150 h-9 w-9 ml-1 group-hover:scale-110',
      },
    }),
    h(
      'p',
      { className: 'text-xs text-muted-foreground truncate pl-1' },
      'Manage Regions mod settings and datasets',
    ),
  ]);
}

export function renderSettingsOverlay(
  h: typeof createElement,
  useStateHook: typeof useState,
  Input: React.ComponentType<InputFieldProperties>,
  Switch: React.ComponentType<SwitchProperties>,
  Label: React.ComponentType<LabelProperties>,
  params: SettingsOverlayParams,
): React.ReactNode {
  const {
    settings,
    isUpdating,
    searchTerm,
    sortState,
    rows,
    onClose,
    onSearchTermChange,
    onSortChange,
    onToggleShowUnpopulatedRegions,
    onRefreshRegistry,
    isRefreshingRegistry,
    onClearMissing,
    isClearingMissing,
    fetchParams: fetch,
  } = params;

  return h(
    'div',
    {
      key: 'settings-overlay',
      className:
        'absolute inset-0 w-full h-full overflow-auto bg-background p-4 z-50',
    },
    [
      h('div', { className: 'max-w-5xl mx-auto flex flex-col gap-4' }, [
        Button(h, {
          label: 'Back',
          ariaLabel: 'Back',
          onClick: onClose,
          icon: Arrow,
          size: 'sm',
          iconOptions: {
            size: 16,
            className: 'h-4 w-4 shrink-0',
            transform: 'rotate(180deg)',
          },
          wrapperClassName: 'w-fit',
        }),
        h('div', { className: 'flex flex-col gap-1' }, [
          h('h1', { className: 'text-xl font-semibold' }, 'Regions Settings'),
          h(
            'p',
            { className: 'text-sm text-muted-foreground' },
            'Settings apply immediately and are stored locally.',
          ),
        ]),
        ReactDivider(h, 1),
        renderGlobalSettingsSection(h, Switch, Label, {
          settings,
          isUpdating,
          onToggleShowUnpopulatedRegions,
        }),
        ReactDivider(h, 1),
        renderDatasetRegistrySection(h, useStateHook, Input, {
          rows,
          searchTerm,
          sortState,
          onSearchTermChange,
          onSortChange,
          onRefreshRegistry,
          isRefreshingRegistry,
          onClearMissing,
          isClearingMissing,
        }),
        ReactDivider(h, 1),
        renderFetchDatasetsSection(h, fetch),
        ReactDivider(h, 1),
        renderSystemPerformanceFooter(h, fetch.systemPerformanceInfo),
      ]),
    ],
  );
}
