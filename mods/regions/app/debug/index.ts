import type { BBox } from 'geojson';

import { formatNumberOrDefault } from '../../core/utils';
import type { RegionsDebugApi, RegionsDebugContext } from './types';

declare global {
  interface Window {
    SubwayBuilderRegions?: {
      debug: RegionsDebugApi;
    };
  }
}

export function attachRegionsDebug(context: RegionsDebugContext): void {
  const buildPaddedBBox = async (
    cityCode?: string,
    paddingKm: number = 10,
  ): Promise<BBox | null> => {
    const resolvedCityCode =
      cityCode ??
      context.getCurrentCityCode() ??
      context.api.utils.getCityCode();

    if (!resolvedCityCode) {
      console.warn('[Regions] Unable to resolve city code for demand bbox');
      return null;
    }

    const bbox = await context
      .getStorage()
      .buildPaddedDemandBBox(resolvedCityCode, paddingKm);
    if (!bbox) {
      console.warn(
        `[Regions] Failed to compute padded demand bbox for city ${resolvedCityCode}`,
      );
    }
    return bbox;
  };

  // Helper function to export bboxes based on in-game demand data for use in boundary-generation scripts.
  const exportCityBBoxes = async (paddingKm: number = 10): Promise<string> => {
    const cities = [...context.api.utils.getCities()].sort((a, b) =>
      a.code.localeCompare(b.code),
    );

    const rows: string[] = ['Code,South,West,North,East'];
    let skippedCount = 0;

    for (const city of cities) {
      const bbox = await buildPaddedBBox(city.code, paddingKm);
      if (!bbox) {
        skippedCount += 1;
        continue;
      }
      // Match format of the boundaries.csv used in boundary extraction scripts
      const [west, south, east, north] = bbox;
      rows.push(
        [
          city.code,
          formatNumberOrDefault(south, 5),
          formatNumberOrDefault(west, 5),
          formatNumberOrDefault(north, 5),
          formatNumberOrDefault(east, 5),
        ].join(','),
      );
    }

    const csv = rows.join('\n');
    console.log(csv);
    console.info(
      `[Regions] exportCityBBoxes generated ${rows.length - 1} rows (skipped ${skippedCount}).`,
    );
    return csv;
  };

  const debug: RegionsDebugApi = {
    settings: {
      print: () => {
        console.log(
          '[Regions] Current settings',
          context.getSettingsSnapshot(),
        );
      },
    },
    registry: {
      print: () => {
        context.getRegistry().printIndex();
      },
    },
    cities: {
      buildPaddedBBox,
      exportCityBBoxes,
    },
    lifecycle: {
      getCurrentCityCode: () => context.getCurrentCityCode(),
      tearDownUIManager: () => context.getUIManager()?.tearDown(),
    },
    ui: {
      getActiveSelection: () => context.getUIManager()?.activeSelection,
      logMapStyle: () => {
        const mapLayers = context.getMapLayers();
        console.log(
          mapLayers ? mapLayers.getMapStyle() : 'Map layers not initialized',
        );
      },
      logLayerOrder: () => {
        const mapLayers = context.getMapLayers();
        console.log(
          mapLayers
            ? mapLayers.getMapLayerOrder()
            : 'Map layers not initialized',
        );
      },
      logVisibleLayers: () => {
        const mapLayers = context.getMapLayers();
        console.log(
          mapLayers
            ? mapLayers.getVisibleLayers()
            : 'Map layers not initialized',
        );
      },
    },
  };

  window.SubwayBuilderRegions = { debug };
}
