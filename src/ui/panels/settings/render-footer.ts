import type React from 'react';
import type { createElement } from 'react';

import { formatNumberOrDefault } from '@/core/utils';
import type { SystemPerformanceInfo } from '@/types/electron';

// Small utility component to show system performance information as is parsed from Electron at mod initialization.
export function renderSystemPerformanceFooter(
  h: typeof createElement,
  systemPerformanceInfo: SystemPerformanceInfo | null,
): React.ReactNode {
  if (!systemPerformanceInfo) {
    return null;
  }

  return h('div', { className: 'flex flex-col gap-2' }, [
    h('p', { className: 'text-[11px] text-muted-foreground' }, [
      `System: ${systemPerformanceInfo.platform} (${systemPerformanceInfo.arch})`,
      ` | RAM: ${formatNumberOrDefault(systemPerformanceInfo.totalRAMGB, 0)} GB`,
      ` | CPU: ${formatNumberOrDefault(systemPerformanceInfo.cpuCores, 0)} cores`,
      ` | Heap: ${formatNumberOrDefault(systemPerformanceInfo.heapSizeMB, 0)} MB`,
    ]),
  ]);
}
