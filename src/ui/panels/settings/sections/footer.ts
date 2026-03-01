import type React from 'react';
import type { createElement } from 'react';

import { formatNumberOrDefault } from '@/core/utils';

import type { SettingsFooterSectionParams } from '../types';

// Small utility component to show system performance information as is parsed from Electron at mod initialization.
export function renderFooterSection(
  h: typeof createElement,
  params: SettingsFooterSectionParams,
): React.ReactNode {
  const info = params.systemPerformanceInfo;
  if (!info) return null;

  return h('div', { className: 'flex flex-col gap-2' }, [
    h('p', { className: 'text-[11px] text-muted-foreground' }, [
      `System: ${info.platform} (${info.arch})`,
      ` | RAM: ${formatNumberOrDefault(info.totalRAMGB, 0)} GB`,
      ` | CPU: ${formatNumberOrDefault(info.cpuCores, 0)} cores`,
      ` | Heap: ${formatNumberOrDefault(info.heapSizeMB, 0)} MB`,
    ]),
  ]);
}
