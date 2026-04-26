import type { LabelProperties, SwitchProperties } from '@lib/ui/panels/types';
import type { ComponentType, createElement, ReactNode } from 'react';

/**
 * A reusable label + description + Switch toggle row.
 *
 * Expects the game's `Switch` and `Label` component references to be passed
 * in so we don't take a hard dependency on a specific React component library.
 */

export type LabeledSwitchParams = {
  /** The game's Switch component (from getGameReact). */
  Switch: ComponentType<SwitchProperties>;
  /** The game's Label component (from getGameReact). */
  Label: ComponentType<LabelProperties>;
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function LabeledSwitch(
  h: typeof createElement,
  params: LabeledSwitchParams,
): ReactNode {
  const {
    Switch,
    Label,
    id,
    label,
    description,
    checked,
    disabled = false,
    onCheckedChange,
  } = params;

  return h(
    'div',
    { className: 'flex items-start justify-between gap-3 text-sm' },
    [
      h('div', { key: 'label', className: 'flex flex-col gap-0.5' }, [
        h(
          Label,
          {
            key: 'lbl',
            htmlFor: id,
            className: 'font-medium text-foreground',
          },
          label,
        ),
        ...(description
          ? [
              h(
                'span',
                {
                  key: 'desc',
                  className: 'text-xs text-muted-foreground',
                },
                description,
              ),
            ]
          : []),
      ]),
      h(Switch, {
        key: 'switch',
        id,
        checked,
        disabled,
        onCheckedChange,
        onChange: (event: Event) => {
          const target = event.target as HTMLInputElement;
          onCheckedChange(Boolean(target.checked));
        },
      }),
    ],
  );
}
