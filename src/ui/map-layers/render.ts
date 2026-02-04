import { ExpressionSpecification, MapLayerEventType } from "maplibre-gl";
import { RegionDataset } from "../../core/datasets";
import { PRIMARY_FILL_COLORS } from "../types/colors";

export type MapListener = {
  eventType: keyof MapLayerEventType;
  handler: (...args: any[]) => void;
}

export type LightMode = 'light' | 'dark';

const BASE_FILL_OPACITY = 0.25;
const HOVER_FILL_OPACITY = 0.5;

const SCALED_TEXT_SIZE_SETTINGS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  5, 10,
  10, 13,
  14, 18
]

const DEFAULT_LIGHT_MODE_LABEL_SETTINGS = {
  "text-color": "#1F2933",
  "hover-text-color": "#0F766E",
  "text-halo-color": "#FFFFFF",
  "text-halo-width": 1.75,
  "hover-halo-width": 2.5,
  "text-halo-blur": 0.3,
  "text-size": SCALED_TEXT_SIZE_SETTINGS,
}

const DEFAULT_DARK_MODE_LABEL_SETTINGS = {
  "text-color": "#F8FAFC",
  "hover-text-color": "#FBBF24",
  "text-halo-color": "#0F172A",
  "text-halo-width": 1.75,
  "hover-halo-width": 2.5,
  "text-halo-blur": 0.3,
  "text-size": SCALED_TEXT_SIZE_SETTINGS,
}

const SCALED_BOUNDARY_LINE_WIDTH_SETTINGS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  4, 0.4,
  8, 0.75,
  12, 1.2
];

const DEFAULT_LIGHT_MODE_BOUNDARY_SETTINGS = {
  "line-color": "#2B2B2B",
  "line-opacity": 0.55,
  "line-width": SCALED_BOUNDARY_LINE_WIDTH_SETTINGS
};

const DEFAULT_DARK_MODE_BOUNDARY_SETTINGS = {
  "line-color": "#D1D5DB",
  "line-opacity": 0.45,
  "line-width": SCALED_BOUNDARY_LINE_WIDTH_SETTINGS
};

export function stateBoolean(
  stateKey: 'hover' | 'selected',
  whenTrue: ExpressionSpecification | string | number,
  whenFalse: ExpressionSpecification | string | number
): ExpressionSpecification {
  return [
    'case',
    ['boolean', ['feature-state', stateKey], false],
    whenTrue,
    whenFalse
  ];
}

export function renderDataset(dataset: RegionDataset, map: maplibregl.Map, lightMode: LightMode = 'dark'): {
  boundaryLayerId: string;
  boundaryLineLayerId: string;
  labelLayerId: string;
} {
  const sourceId = `${dataset.getSourcePrefix()}-boundaries`;
  const labelSourceId = `${dataset.getSourcePrefix()}-labels`;
  const boundaryLayerId = `${dataset.getLayerPrefix()}-boundary-fill`;
  const boundaryLineLayerId = `${dataset.getLayerPrefix()}-boundary-outline`;
  const labelLayerId = `${dataset.getLayerPrefix()}-label`;

  // -- Map Source & Layer --
  if (!map.getSource(sourceId)) {
    map.addSource(
      sourceId,
      {
        type: 'geojson',
        data: dataset.boundaryData!,
        promoteId: 'ID'
      }
    )
  } else {
    // If map layer source already exists, update data
    console.log(`[Regions] Updating data for source: ${sourceId}`);
    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(dataset.boundaryData!);
  }

  const boundarySettings = lightMode === 'light' ? DEFAULT_LIGHT_MODE_BOUNDARY_SETTINGS : DEFAULT_DARK_MODE_BOUNDARY_SETTINGS;
  const labelSettings = lightMode === 'light' ? DEFAULT_LIGHT_MODE_LABEL_SETTINGS : DEFAULT_DARK_MODE_LABEL_SETTINGS;

  if (!map.getLayer(boundaryLayerId)) {
    map.addLayer({
      id: boundaryLayerId,
      type: 'fill',
      source: sourceId,
      layout: {
        visibility: 'none',
      },
      paint: {
        'fill-color':
          stateBoolean(
            'hover',
            dataset.hoverDisplayColor || PRIMARY_FILL_COLORS[0].hover,
            dataset.boundaryDisplayColor || PRIMARY_FILL_COLORS[0].hex
          ),
        'fill-opacity': stateBoolean(
          'hover',
          HOVER_FILL_OPACITY,
          BASE_FILL_OPACITY
        )
      }
    })
  }

  if (!map.getLayer(boundaryLineLayerId)) {
    map.addLayer({
      id: boundaryLineLayerId,
      type: 'line',
      source: sourceId,
      layout: {
        visibility: 'none',
      },
      paint: {
        "line-color": boundarySettings["line-color"],
        "line-width": boundarySettings["line-width"],
        "line-opacity": boundarySettings["line-opacity"]
      }
    })
  };

  // -- Label Source & Layer --
  if (!map.getSource(labelSourceId)) {
    map.addSource(
      labelSourceId,
      {
        type: 'geojson',
        data: dataset.labelData!,
        promoteId: 'ID'
      }
    );
  } else {
    // update existing label source data
    console.log(`[Regions] Updating data for label source: ${labelSourceId}`);
    (map.getSource(labelSourceId) as maplibregl.GeoJSONSource).setData(dataset.labelData!);
  }

  if (!map.getLayer(labelLayerId)) {
    map.addLayer({
      id: labelLayerId,
      type: 'symbol',
      source: labelSourceId,
      layout: {
        'text-field': ['get', 'NAME'],
        'text-size': labelSettings["text-size"],
        'text-font': ['Noto Sans Regular'],
        'text-anchor': 'center',
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        visibility: 'none'
      },
      paint: {
        "text-color": stateBoolean(
          'hover',
          labelSettings["hover-text-color"],
          labelSettings["text-color"]
        ),
        "text-halo-color": labelSettings["text-halo-color"],
        "text-halo-width": stateBoolean(
          'hover',
          labelSettings["hover-halo-width"],
          labelSettings["text-halo-width"]
        ),
        "text-halo-blur": labelSettings["text-halo-blur"]
      }
    });
  }

  return {
    boundaryLayerId,
    boundaryLineLayerId,
    labelLayerId
  }
}
