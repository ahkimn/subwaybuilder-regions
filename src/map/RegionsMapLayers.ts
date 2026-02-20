import {
  ENFORCE_ONE_DATASET_VISIBLE,
  OVERVIEW_REGION_FOCUS_DURATION_MS,
  OVERVIEW_REGION_FOCUS_MAX_PADDING_PX,
  OVERVIEW_REGION_FOCUS_MAX_ZOOM,
  OVERVIEW_REGION_FOCUS_MIN_BBOX_SPAN_DEGREES,
  OVERVIEW_REGION_FOCUS_MIN_PADDING_PX,
  OVERVIEW_REGION_FOCUS_TARGET_COVERAGE,
  SHOW_UNPOPULATED_REGIONS,
} from '../core/constants';
import { RegionDataset } from '../core/datasets/RegionDataset';
import {
  buildBBoxFitState as fitBBox,
  normalizeBBox,
} from '../core/geometry/helpers';
import { RegionSelection } from '../core/types';
import type { MapDisplayColor } from '../ui/types/DisplayColor';
import { PRIMARY_FILL_COLORS } from '../ui/types/DisplayColor';
import type { LayerToggleOptions } from '../ui/types/LayerToggleOptions';
import type { LightMode } from './styles';
import {
  DEFAULT_DARK_MODE_BOUNDARY_SETTINGS,
  DEFAULT_DARK_MODE_LABEL_SETTINGS,
  DEFAULT_LIGHT_MODE_BOUNDARY_SETTINGS,
  DEFAULT_LIGHT_MODE_LABEL_SETTINGS,
  stateBoolean,
} from './styles';

const FORCE_HIDE_LAYERS_ON_DROP = false; // TODO: Expose via mod settings.

type MapLayerState = {
  datasetIdentifier: string;
  sourceId: string;
  labelSourceId: string;
  boundaryLayerId: string;
  boundaryLineLayerId: string;
  labelLayerId: string;
  visible: boolean;
  handlers?: LayerHandlers;
};

type MapLayerStyle = {
  fillColor: MapDisplayColor;
};

type LayerHandlers = {
  hoveredId?: string | number;
  onMouseMove: (e: maplibregl.MapLayerMouseEvent) => void;
  onMouseLeave: (e: maplibregl.MapLayerMouseEvent) => void;
  onClick: (e: maplibregl.MapLayerMouseEvent) => void;
};

type RegionSelectPayload = {
  dataset: RegionDataset;
  featureId: string | number;
};

type RegionFocusOptions = {
  targetCoverage: number;
  minPaddingPx: number;
  maxPaddingPx: number;
  maxZoom: number;
  durationMs: number;
  minBBoxSpanDegrees: number;
};

export type RegionsMapLayersEvents = {
  onRegionSelect?: (payload: RegionSelectPayload) => void;
  onLayerStateSync?: () => void;
  onLayerVisibilityChange?: (payload: {
    datasetIdentifier: string;
    visible: boolean;
  }) => void;
};

export class RegionsMapLayers {
  private map: maplibregl.Map;
  private lightMode: LightMode = 'dark';
  private nextColorIndex = 0;
  private layerStates = new Map<string, MapLayerState>();
  private layerStyles = new Map<string, MapLayerStyle>();

  private observedDatasets: RegionDataset[] = [];

  private layerHandler: (() => void) | null = null;
  private styleHandler: (() => void) | null = null;
  private sourceHandler: (() => void) | null = null;

  private selectionProvider: (() => RegionSelection | null) | null = null;

  private events: RegionsMapLayersEvents = {};

  constructor(map: maplibregl.Map) {
    this.map = map;
  }

  // The game may dispose and recreate map instances during city transitions.
  private getMapReference(): maplibregl.Map | null {
    const mapRef = this.map as maplibregl.Map | undefined;
    return mapRef ?? null;
  }

  private tryGetLayer(layerId: string): maplibregl.StyleLayer | undefined {
    const mapRef = this.getMapReference();
    if (!mapRef) {
      console.warn(
        `[Regions] Cannot get layer ${layerId}: map reference is null`,
      );
      return undefined;
    }

    try {
      return mapRef.getLayer(layerId);
    } catch (e) {
      console.error(`[Regions] Error retrieving layer ${layerId} from map.`, e);
      return undefined;
    }
  }

  private rebindMap(map: maplibregl.Map) {
    const oldMap = this.getMapReference();
    // Best effot attempt to detach existing handlers from old map instance (if it exists)
    if (oldMap) {
      [this.layerHandler, this.styleHandler, this.sourceHandler].forEach(
        (handler) => {
          if (handler) {
            try {
              oldMap.off('data', handler);
            } catch (e) {
              // Ignore detach errors from disposed map instances
            }
          }
        },
      );

      for (const layerState of this.layerStates.values()) {
        if (!layerState.handlers) {
          continue;
        }
        const { onMouseMove, onMouseLeave, onClick } = layerState.handlers;
        const labelLayerId = layerState.labelLayerId;
        try {
          oldMap.off('mousemove', labelLayerId, onMouseMove);
          oldMap.off('mouseleave', labelLayerId, onMouseLeave);
          oldMap.off('click', labelLayerId, onClick);
        } catch (e) {
          // Ignore detach errors from disposed map instances
        }
        layerState.handlers = undefined;
      }
    } else {
      this.layerHandler = null;
      this.styleHandler = null;
      this.sourceHandler = null;
    }
    // Clear in-memory layers state
    this.layerStates.clear();
    this.layerStyles.clear();
    this.observedDatasets = [];
    this.nextColorIndex = 0;
    this.map = map;
  }

  setMap(map: maplibregl.Map | null | undefined) {
    if (!map) {
      console.error(
        '[Regions] Cannot rebind RegionsMapLayers: map instance is null or undefined',
      );
      return;
    }

    if (this.map === map) return;
    this.rebindMap(map);
    console.log('[Regions] Rebound RegionsMapLayers to a new map instance');
  }

  setEvents(events: RegionsMapLayersEvents) {
    this.events = events;
  }

  setSelectionProvider(provider: () => RegionSelection | null) {
    this.selectionProvider = provider;
  }

  updateSelection(
    previousSelection: RegionSelection | null,
    newSelection: RegionSelection | null,
  ) {
    if (RegionSelection.isEqual(previousSelection, newSelection)) {
      return;
    }
    if (previousSelection !== null) {
      const previousState = this.layerStates.get(
        previousSelection.datasetIdentifier,
      );
      if (previousState) {
        this.setSelectedState(
          previousState,
          previousSelection.featureId,
          false,
        );
      }
    }

    if (newSelection !== null) {
      const nextState = this.layerStates.get(newSelection.datasetIdentifier);
      if (nextState) {
        this.setSelectedState(nextState, newSelection.featureId, true);
      }
    }
  }

  ensureDatasetLayers(dataset: RegionDataset) {
    if (!dataset.isLoaded) {
      console.warn(
        `[Regions] Cannot render dataset ${dataset.id}: data not loaded`,
      );
      return;
    }

    const datasetIdentifier = RegionDataset.getIdentifier(dataset);
    if (this.layerStates.has(datasetIdentifier)) {
      this.updateMapLayers(dataset, this.layerStates.get(datasetIdentifier)!);
      return;
    }

    const sourceId = `${RegionDataset.getSourcePrefix(dataset)}-boundaries`;
    const labelSourceId = `${RegionDataset.getSourcePrefix(dataset)}-labels`;
    const boundaryLayerId = `${RegionDataset.getLayerPrefix(dataset)}-boundary-fill`;
    const boundaryLineLayerId = `${RegionDataset.getLayerPrefix(dataset)}-boundary-outline`;
    const labelLayerId = `${RegionDataset.getLayerPrefix(dataset)}-label`;

    const state: MapLayerState = {
      datasetIdentifier,
      sourceId,
      labelSourceId,
      boundaryLayerId,
      boundaryLineLayerId,
      labelLayerId,
      visible: false,
    };
    this.updateMapLayers(dataset, state);
    this.layerStates.set(datasetIdentifier, state);
  }

  toggleOrSetVisibility(dataset: RegionDataset, visible?: boolean): void {
    const datasetIdentifier = RegionDataset.getIdentifier(dataset);
    this.ensureDatasetLayers(dataset);

    const layerState = this.layerStates.get(datasetIdentifier);
    if (!layerState) {
      console.warn(
        `[Regions] Cannot toggle visibility for unknown dataset ${datasetIdentifier}`,
      );
      return;
    }

    const nextVisible = visible !== undefined ? visible : !layerState.visible;
    if (nextVisible === layerState.visible) return;

    if (nextVisible && ENFORCE_ONE_DATASET_VISIBLE) {
      this.hideOtherVisibleLayers(datasetIdentifier);
    }

    layerState.visible = nextVisible;
    this.applyVisibility(layerState);

    this.events.onLayerVisibilityChange?.({
      datasetIdentifier,
      visible: nextVisible,
    });

    console.log(
      `[Regions] Toggled visibility for dataset ${dataset.displayName} to ${layerState.visible}`,
    );
  }

  private hideOtherVisibleLayers(datasetIdentifier: string): void {
    for (const [
      otherDatasetIdentifier,
      layerState,
    ] of this.layerStates.entries()) {
      if (datasetIdentifier === otherDatasetIdentifier || !layerState.visible)
        continue;

      layerState.visible = false;
      this.applyVisibility(layerState);

      this.events.onLayerVisibilityChange?.({
        datasetIdentifier: otherDatasetIdentifier,
        visible: false,
      });
    }
  }

  private applyVisibility(layerState: MapLayerState) {
    const mapRef = this.getMapReference();
    if (!mapRef) return;

    const visibility = layerState.visible ? 'visible' : 'none';
    [
      layerState.boundaryLayerId,
      layerState.boundaryLineLayerId,
      layerState.labelLayerId,
    ].forEach((layerId) => {
      if (this.tryGetLayer(layerId)) {
        mapRef.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });

    if (
      layerState.visible &&
      layerState.labelLayerId &&
      this.tryGetLayer(layerState.labelLayerId)
    ) {
      mapRef.moveLayer(layerState.labelLayerId);
    }
  }

  removeDatasetMapLayers(identifier: string) {
    const mapRef = this.getMapReference();
    if (!mapRef) {
      this.layerStates.delete(identifier);
      this.layerStyles.delete(identifier);
      return;
    }

    const layerState = this.layerStates.get(identifier);
    if (!layerState) {
      console.warn(
        `[Regions] Cannot remove map layers for unknown dataset ${identifier}`,
      );
      return;
    }

    if (layerState.handlers) {
      this.detachLayerLabelHandlers(layerState);
    }

    const layersToRemove = [
      layerState.boundaryLayerId,
      layerState.boundaryLineLayerId,
      layerState.labelLayerId,
    ];

    layersToRemove.forEach((layerId) => {
      if (this.tryGetLayer(layerId)) {
        mapRef.removeLayer(layerId);
      }
    });

    // Remove sources after corresponding layers are removed
    const sourcesToRemove = [layerState.sourceId, layerState.labelSourceId];

    sourcesToRemove.forEach((sourceId) => {
      if (mapRef.getSource(sourceId)) {
        mapRef.removeSource(sourceId);
      }
    });

    this.layerStates.delete(identifier);
    this.layerStyles.delete(identifier);
  }

  reset() {
    const mapRef = this.getMapReference();

    if (!mapRef) {
      this.layerHandler = null;
      this.styleHandler = null;
      this.sourceHandler = null;
      this.layerStates.clear();
      this.layerStyles.clear();
      this.observedDatasets = [];
      this.nextColorIndex = 0;
      return;
    }

    if (this.layerHandler) {
      mapRef.off('data', this.layerHandler);
      this.layerHandler = null;
      this.observedDatasets = [];
    }
    // TODO (Bug 3): Verify that style and source handlers work when map-layering isn't overriden in game.
    if (this.styleHandler) {
      mapRef.off('styledata', this.styleHandler);
      this.styleHandler = null;
    }
    if (this.sourceHandler) {
      mapRef.off('sourcedata', this.sourceHandler);
      this.sourceHandler = null;
    }
    for (const identifier of this.layerStates.keys()) {
      this.removeDatasetMapLayers(identifier);
    }
    this.nextColorIndex = 0;
  }

  // --- Minor Helpers --- //
  isVisible(dataset: RegionDataset): boolean {
    return (
      this.layerStates.get(RegionDataset.getIdentifier(dataset))?.visible ??
      false
    );
  }

  getVisibleLayers(): Set<string> {
    return new Set(
      Array.from(this.layerStates.values())
        .filter((state) => state.visible)
        .map((state) => state.datasetIdentifier),
    );
  }

  getDatasetToggleOptions(dataset: RegionDataset): LayerToggleOptions {
    return {
      id: dataset.id,
      label: dataset.displayName,
      isVisible: () => this.isVisible(dataset),
      toggle: () => this.toggleOrSetVisibility(dataset),
    };
  }

  getMapStyle() {
    const mapRef = this.getMapReference();
    if (!mapRef) return null;
    return mapRef.getStyle();
  }

  getMapLayerOrder(): string[] {
    const mapRef = this.getMapReference();
    if (!mapRef) return [];
    return mapRef.getStyle().layers?.map((layer) => layer.id) ?? [];
  }

  focusRegion(
    dataset: RegionDataset,
    featureId: string | number,
    options?: Partial<RegionFocusOptions>,
  ): void {
    const mapRef = this.getMapReference();
    if (!mapRef) return;

    const boundaryParams = dataset.regionBoundaryParamsMap.get(featureId);
    if (!boundaryParams) {
      console.warn(
        `[Regions] No cached boundary params for feature ${String(
          featureId,
        )} in dataset ${RegionDataset.getIdentifier(dataset)}`,
      );
      return;
    }

    const mapContainer = mapRef.getContainer();
    const viewportWidth = mapContainer?.clientWidth ?? 0;
    const viewportHeight = mapContainer?.clientHeight ?? 0;
    const minBBoxSpanDegrees =
      options?.minBBoxSpanDegrees ??
      OVERVIEW_REGION_FOCUS_MIN_BBOX_SPAN_DEGREES;

    const normalizedBBox = normalizeBBox(
      boundaryParams.bbox,
      minBBoxSpanDegrees,
      minBBoxSpanDegrees,
    );
    const bboxFit = fitBBox(
      normalizedBBox,
      viewportWidth,
      viewportHeight,
      options?.targetCoverage ?? OVERVIEW_REGION_FOCUS_TARGET_COVERAGE,
      options?.minPaddingPx ?? OVERVIEW_REGION_FOCUS_MIN_PADDING_PX,
      options?.maxPaddingPx ?? OVERVIEW_REGION_FOCUS_MAX_PADDING_PX,
    );

    mapRef.fitBounds(
      [
        [bboxFit.bbox[0], bboxFit.bbox[1]],
        [bboxFit.bbox[2], bboxFit.bbox[3]],
      ],
      {
        padding: bboxFit.padding,
        maxZoom: options?.maxZoom ?? OVERVIEW_REGION_FOCUS_MAX_ZOOM,
        duration: options?.durationMs ?? OVERVIEW_REGION_FOCUS_DURATION_MS,
      },
    );
  }

  // --- Layer Render Helpers --- //
  private updateMapLayers(dataset: RegionDataset, layerState: MapLayerState) {
    this.updateSource(layerState.sourceId, dataset.boundaryData!);
    this.updateSource(layerState.labelSourceId, dataset.labelData!);

    this.addBoundaryLayer(layerState);
    this.addLabelLayer(layerState);
    this.applyLightModeToLayerState(layerState);
  }

  private buildDemandExistsFilter(): maplibregl.FilterSpecification {
    if (SHOW_UNPOPULATED_REGIONS) {
      return ['all'];
    }

    return ['==', ['get', 'EXISTS_DEMAND'], true];
  }

  private updateSource(sourceId: string, data: GeoJSON.FeatureCollection) {
    if (!this.map.getSource(sourceId)) {
      this.map.addSource(sourceId, {
        type: 'geojson',
        data: data,
        promoteId: 'ID',
      });
    } else {
      (this.map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
    }
  }

  private determineStyle(datasetIdentifier: string): MapLayerStyle {
    if (this.layerStyles.has(datasetIdentifier)) {
      return this.layerStyles.get(datasetIdentifier)!;
    }

    const color =
      PRIMARY_FILL_COLORS[this.nextColorIndex % PRIMARY_FILL_COLORS.length];
    this.nextColorIndex++;

    const style: MapLayerStyle = { fillColor: color };
    this.layerStyles.set(datasetIdentifier, style);
    return style;
  }

  private addBoundaryLayer(layerState: MapLayerState) {
    const style = this.determineStyle(layerState.datasetIdentifier);
    if (!this.tryGetLayer(layerState.boundaryLayerId)) {
      this.map.addLayer({
        id: layerState.boundaryLayerId,
        type: 'fill',
        source: layerState.sourceId,
        filter: this.buildDemandExistsFilter(),
        layout: {
          visibility: 'none',
        },
        paint: {
          'fill-color': stateBoolean(
            'selected',
            style.fillColor.hover,
            stateBoolean('hover', style.fillColor.hover, style.fillColor.hex),
          ),
        },
      });
    }

    if (!this.tryGetLayer(layerState.boundaryLineLayerId)) {
      this.map.addLayer({
        id: layerState.boundaryLineLayerId,
        type: 'line',
        source: layerState.sourceId,
        filter: this.buildDemandExistsFilter(),
        layout: {
          visibility: 'none',
        },
        paint: {},
      });
    }
  }

  private addLabelLayer(layerState: MapLayerState) {
    if (!this.tryGetLayer(layerState.labelLayerId)) {
      this.map.addLayer({
        id: layerState.labelLayerId,
        type: 'symbol',
        source: layerState.labelSourceId,
        filter: this.buildDemandExistsFilter(),
        layout: {
          'text-field': ['get', 'NAME'],
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          visibility: 'none',
        },
        paint: {},
      });
    }
  }

  // --- Style Handlers --- //
  setLightMode(mode: LightMode): void {
    if (this.lightMode === mode) {
      return;
    }
    this.lightMode = mode;
    for (const layerState of this.layerStates.values()) {
      this.applyLightModeToLayerState(layerState);
    }
  }

  private resolveBoundarySettings(mode: LightMode) {
    return mode === 'light'
      ? DEFAULT_LIGHT_MODE_BOUNDARY_SETTINGS
      : DEFAULT_DARK_MODE_BOUNDARY_SETTINGS;
  }

  private resolveLabelSettings(mode: LightMode) {
    return mode === 'light'
      ? DEFAULT_LIGHT_MODE_LABEL_SETTINGS
      : DEFAULT_DARK_MODE_LABEL_SETTINGS;
  }

  private applyLightModeToLayerState(layerState: MapLayerState): void {
    const mapRef = this.getMapReference();
    if (!mapRef) return;

    const boundarySettings = this.resolveBoundarySettings(this.lightMode);
    const labelSettings = this.resolveLabelSettings(this.lightMode);

    if (this.tryGetLayer(layerState.boundaryLineLayerId)) {
      mapRef.setPaintProperty(
        layerState.boundaryLineLayerId,
        'line-color',
        boundarySettings['line-color'],
      );
      mapRef.setPaintProperty(
        layerState.boundaryLineLayerId,
        'line-opacity',
        boundarySettings['line-opacity'],
      );
      mapRef.setPaintProperty(
        layerState.boundaryLineLayerId,
        'line-width',
        boundarySettings['line-width'],
      );
    }

    if (this.tryGetLayer(layerState.boundaryLayerId)) {
      mapRef.setPaintProperty(
        layerState.boundaryLayerId,
        'fill-opacity',
        stateBoolean(
          'selected',
          boundarySettings['selected-fill-opacity'],
          stateBoolean(
            'hover',
            boundarySettings['hover-fill-opacity'],
            boundarySettings['fill-opacity'],
          ),
        ),
      );
    }

    if (this.tryGetLayer(layerState.labelLayerId)) {
      mapRef.setLayoutProperty(
        layerState.labelLayerId,
        'text-size',
        labelSettings['text-size'],
      );
      mapRef.setLayoutProperty(
        layerState.labelLayerId,
        'text-font',
        labelSettings['text-font'],
      );
      mapRef.setLayoutProperty(
        layerState.labelLayerId,
        'text-letter-spacing',
        labelSettings['text-letter-spacing'],
      );
      mapRef.setPaintProperty(
        layerState.labelLayerId,
        'text-color',
        stateBoolean(
          'hover',
          labelSettings['hover-text-color'],
          labelSettings['text-color'],
        ),
      );
      mapRef.setPaintProperty(
        layerState.labelLayerId,
        'text-halo-color',
        labelSettings['text-halo-color'],
      );
      mapRef.setPaintProperty(
        layerState.labelLayerId,
        'text-halo-width',
        stateBoolean(
          'hover',
          labelSettings['hover-halo-width'],
          labelSettings['text-halo-width'],
        ),
      );
      mapRef.setPaintProperty(
        layerState.labelLayerId,
        'text-halo-blur',
        labelSettings['text-halo-blur'],
      );
    }
  }

  // --- Label Layer Handlers --- //

  /*
   Currently, custom map layers and sources are removed from the map on certain state changes, namely:
    - Loading an in-game panel that affects the map (e.x. construction menu, demand data panel)
    - Rotating the map view

   To handle this, this function observes the 'data' events on the map object and attempts to reconcile the state of this object and its handlers with the map state
  */
  observeMapLayersForDatasets(datasets: RegionDataset[]) {
    const mapRef = this.getMapReference();
    if (!mapRef) return;

    this.observedDatasets = datasets;
    if (this.layerHandler) return;

    // TODO (Bug 3): Verify that style and source handlers work when map-layering isn't overriden in game
    this.styleHandler = () => {
      this.moveVisibleLabelsToTop();
    };
    mapRef.on('styledata', this.styleHandler);

    this.sourceHandler = () => {
      this.moveVisibleLabelsToTop();
    };
    mapRef.on('sourcedata', this.sourceHandler);

    this.layerHandler = () => {
      let syncLayerState = false;
      for (const dataset of this.observedDatasets) {
        const identifier = RegionDataset.getIdentifier(dataset);
        const layerState = this.layerStates.get(identifier);
        if (!layerState) {
          continue;
        }
        const hasLayer = this.tryGetLayer(layerState.labelLayerId);

        if (hasLayer && !layerState.handlers) {
          this.applyVisibility(layerState);
          this.applySelectionFromProvider(layerState);
          this.attachLabelHandlers(dataset);
          console.log(
            `[Regions] Re-attached label handlers for dataset ${identifier} after layer re-addition`,
          );
          syncLayerState = true;
        }

        if (!hasLayer && layerState.handlers) {
          if (FORCE_HIDE_LAYERS_ON_DROP) {
            layerState.visible = false;
          }
          this.detachLabelHandlers(dataset);
          console.log(
            `[Regions] Detached label handlers for dataset ${identifier} due to layer removal`,
          );
          syncLayerState = true;
        }
      }

      if (syncLayerState) {
        this.events.onLayerStateSync?.();
      }
    };

    mapRef.on('data', this.layerHandler);
  }

  // This currently does not work as the game's default layers always seem to maintain priority on the map's z-axis :/
  private moveVisibleLabelsToTop(): void {
    const mapRef = this.getMapReference();
    if (!mapRef) return;

    for (const dataset of this.observedDatasets) {
      const identifier = RegionDataset.getIdentifier(dataset);
      const layerState = this.layerStates.get(identifier);
      if (!layerState || !layerState.visible) {
        continue;
      }
      if (this.tryGetLayer(layerState.labelLayerId)) {
        mapRef.moveLayer(layerState.labelLayerId);
      }
    }
  }

  private applySelectionFromProvider(layerState: MapLayerState): void {
    if (!this.selectionProvider) return;
    const selection = this.selectionProvider();
    if (selection === null) return;
    if (selection.datasetIdentifier !== layerState.datasetIdentifier) return;
    this.setSelectedState(layerState, selection.featureId, true);
  }

  private setSelectedState(
    layerState: MapLayerState,
    featureId: string | number,
    selected: boolean,
  ) {
    const sources = [layerState.sourceId, layerState.labelSourceId];
    sources.forEach((sourceId) => {
      if (this.map.getSource(sourceId)) {
        this.map.setFeatureState(
          { source: sourceId, id: featureId },
          { selected },
        );
      }
    });
  }

  private attachLabelHandlers(dataset: RegionDataset): void {
    const mapRef = this.getMapReference();
    if (!mapRef) return;

    const datasetIdentifier = RegionDataset.getIdentifier(dataset);
    const layerState = this.layerStates.get(datasetIdentifier);
    if (!layerState) {
      console.warn(
        `[Regions] Cannot attach label handlers ${datasetIdentifier}`,
      );
      return;
    }

    const labelLayerId = layerState.labelLayerId;
    const sources = [layerState.sourceId, layerState.labelSourceId];

    if (this.tryGetLayer(layerState.labelLayerId) == null) {
      console.warn(
        `[Regions] Cannot attach label handlers for dataset ${datasetIdentifier}. Label layer: ${layerState.labelLayerId} is not attached`,
      );
      return;
    } else if (layerState.handlers) {
      // Handlers already attached
      return;
    }

    let hoveredId: string | number | undefined = undefined;

    const onMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features?.length || !this.tryGetLayer(labelLayerId)) return;
      const featureId = e.features[0].id;
      if (featureId == null) return;

      if (hoveredId !== undefined && hoveredId !== featureId) {
        sources.forEach((sourceId) =>
          mapRef.setFeatureState(
            { source: sourceId, id: hoveredId },
            { hover: false },
          ),
        );
      }
      hoveredId = featureId;
      sources.forEach((sourceId) =>
        mapRef.setFeatureState(
          { source: sourceId, id: featureId },
          { hover: true },
        ),
      );
      mapRef.getCanvas().style.cursor = 'pointer';
    };

    const onMouseLeave = (e: maplibregl.MapLayerMouseEvent) => {
      if (!this.tryGetLayer(labelLayerId)) return;
      if (hoveredId !== undefined) {
        sources.forEach((sourceId) =>
          mapRef.setFeatureState(
            { source: sourceId, id: hoveredId },
            { hover: false },
          ),
        );
      }
      hoveredId = undefined;
      mapRef.getCanvas().style.cursor = '';
    };

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (!this.tryGetLayer(labelLayerId)) return;
      if (!e.features?.length) return;
      const feature = e.features[0];
      const featureId = feature.id;
      if (featureId == null) return;
      this.handleRegionSelect(dataset, featureId);
    };

    mapRef.on('mousemove', labelLayerId, onMouseMove);
    mapRef.on('mouseleave', labelLayerId, onMouseLeave);
    mapRef.on('click', labelLayerId, onClick);

    console.log(
      `[Regions] Attached label handlers for dataset ${datasetIdentifier}`,
    );

    layerState.handlers = {
      hoveredId,
      onMouseMove,
      onMouseLeave,
      onClick,
    };
  }

  private detachLabelHandlers(dataset: RegionDataset): void {
    const identifier = RegionDataset.getIdentifier(dataset);
    const layerState = this.layerStates.get(identifier)!;
    this.detachLayerLabelHandlers(layerState);
  }

  private detachLayerLabelHandlers(layerState: MapLayerState): void {
    const mapRef = this.getMapReference();
    if (!mapRef) {
      layerState.handlers = undefined;
      return;
    }

    if (!layerState.handlers) {
      console.warn(
        `[Regions] Cannot detach label handlers for dataset ${layerState.datasetIdentifier}`,
      );
      return;
    }

    const { onMouseMove, onMouseLeave, onClick } = layerState.handlers;
    const labelLayerId = layerState.labelLayerId;

    mapRef.off('mousemove', labelLayerId, onMouseMove);
    mapRef.off('mouseleave', labelLayerId, onMouseLeave);
    mapRef.off('click', labelLayerId, onClick);

    layerState.handlers = undefined;
  }

  // --- External Event Handlers --- //

  private handleRegionSelect(
    dataset: RegionDataset,
    featureId: string | number,
  ) {
    if (this.events.onRegionSelect) {
      this.events.onRegionSelect({ dataset, featureId });
    }
  }
}
