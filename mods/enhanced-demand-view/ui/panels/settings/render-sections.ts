import type React from 'react';
import type { createElement } from 'react';

import { Button } from '@lib/ui/elements/Button';
import { ReactDivider } from '@lib/ui/elements/Divider';
import { Arrow, ScanSearchIcon } from '@lib/ui/elements/utils/Icons';
import { renderGlobalSettingsSection } from './sections/global-settings';
import type { SettingsOverlayParams } from './types';

export function renderSettingsEntry(
  h: typeof createElement,
  onOpen: () => void,
): React.ReactNode {
  return h('div', { key: 'entry', className: 'flex flex-col gap-1 min-w-0' }, [
    Button(h, {
      label: 'Enhanced Demand',
      ariaLabel: 'Open Enhanced Demand View Settings',
      onClick: onOpen,
      icon: ScanSearchIcon,
      iconPlacement: 'start',
      wrapperClassName: 'w-full min-w-0',
      buttonClassName:
        'max-w-full font-bold group flex items-center bg-primary text-primary-foreground cursor-pointer ' +
        'justify-start gap-1.5 w-full h-9 hover:bg-primary/90 transition-colors rounded-none px-1 overflow-hidden',
      labelClassName: 'h-full text-3xl truncate',
      iconOptions: {
        size: 20,
        className:
          'min-w-fit transition-all duration-150 h-9 w-9 ml-1 group-hover:scale-110',
      },
    }),
    h(
      'p',
      { className: 'text-xs text-muted-foreground truncate pl-1' },
      'Demand dot display settings',
    ),
  ]);
}

export function renderSettingsOverlay(
  h: typeof createElement,
  params: SettingsOverlayParams,
): React.ReactNode {
  const { onClose } = params;

  return h(
    'div',
    {
      key: 'settings-overlay',
      className:
        'absolute inset-0 w-full h-full overflow-auto bg-background p-4 z-50',
    },
    [
      h('div', { className: 'max-w-5xl mx-auto flex flex-col gap-5' }, [
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
        h('div', { className: 'flex flex-col gap-1.5' }, [
          h(
            'h1',
            { className: 'text-2xl font-semibold' },
            'Enhanced Demand View Settings',
          ),
          h(
            'p',
            { className: 'text-sm text-muted-foreground' },
            'Settings apply immediately and are stored locally.',
          ),
        ]),
        ReactDivider(h, 1),
        renderGlobalSettingsSection(h, params.globalParams),
      ]),
    ],
  );
}
