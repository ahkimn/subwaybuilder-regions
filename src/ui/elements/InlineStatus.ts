import type { createElement, ReactNode } from 'react';

import { REGIONS_ID_ATTR } from '@/core/constants';

import { getPrimaryChartColorByName } from '../types/DisplayColor';
import {
  CircleCheck,
  CircleInfo,
  createReactIconElement,
  type IconDefinition,
  OctagonX,
  TriangleWarning,
} from './utils/Icons';

export type InlineStatusVariant = 'success' | 'warning' | 'error' | 'info';

interface InlineStatusProps {
  h: typeof createElement;
  label: string;
  status?: InlineStatusVariant;
  icon?: IconDefinition;
  colorHex?: string;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  dataRegionsId?: string;
}

const SUCCESS_HEX = getPrimaryChartColorByName('Green').hex;
const WARNING_HEX = getPrimaryChartColorByName('Amber').hex;
const ERROR_HEX = getPrimaryChartColorByName('Red').hex;
const INFO_HEX = getPrimaryChartColorByName('Blue').hex;

const INLINE_STATUS_TEXT_CLASS =
  'ml-2 inline-flex items-center gap-1 text-xs font-normal leading-none align-middle';
const INLINE_STATUS_ICON_CLASS = 'h-3.5 w-3.5 shrink-0';

const INLINE_STATUS_DEFAULTS: Record<
  InlineStatusVariant,
  { icon: IconDefinition; colorHex: string }
> = {
  success: {
    icon: CircleCheck,
    colorHex: SUCCESS_HEX,
  },
  warning: {
    icon: TriangleWarning,
    colorHex: WARNING_HEX,
  },
  error: {
    icon: OctagonX,
    colorHex: ERROR_HEX,
  },
  info: {
    icon: CircleInfo,
    colorHex: INFO_HEX,
  },
};

export function InlineStatus({
  h,
  label,
  status = 'info',
  icon,
  colorHex,
  className,
  iconClassName,
  labelClassName,
  dataRegionsId,
}: InlineStatusProps): ReactNode {
  const defaults = INLINE_STATUS_DEFAULTS[status];

  return h(
    'span',
    {
      className: className ?? INLINE_STATUS_TEXT_CLASS,
      style: { color: colorHex ?? defaults.colorHex },
      ...(dataRegionsId ? { [REGIONS_ID_ATTR]: dataRegionsId } : {}),
    },
    [
      createReactIconElement(h, icon ?? defaults.icon, {
        size: 14,
        className: iconClassName ?? INLINE_STATUS_ICON_CLASS,
      }),
      h('span', { className: labelClassName }, label),
    ],
  );
}
