import { RegionDataset } from "../core/datasets/RegionDataset";
import { DisplayColor, PRIMARY_FILL_COLORS } from "../ui/types/DisplayColor";
import { LayerToggleOptions } from "../ui/types/LayerToggleOptions";
import { BASE_FILL_OPACITY, DEFAULT_DARK_MODE_BOUNDARY_SETTINGS, DEFAULT_DARK_MODE_LABEL_SETTINGS, DEFAULT_LIGHT_MODE_BOUNDARY_SETTINGS, DEFAULT_LIGHT_MODE_LABEL_SETTINGS, HOVER_FILL_OPACITY, LightMode, stateBoolean } from "./styles";

const FORCE_HIDE_LAYERS_ON_DROP = false; // TODO: Expose via mod settings.

type MapLayerState = {
  datasetIdentifier: string,
  sourceId: string;
  labelSourceId: string;
  boundaryLayerId: string;
  boundaryLineLayerId: string;
  labelLayerId: string;
  visible: boolean;
  handlers?: LayerHandlers;
}

type MapLayerStyle = {
  fillColor: DisplayColor
}

type LayerHandlers = {
  hoveredId?: string | number;
  onMouseMove: (e: maplibregl.MapLayerMouseEvent) => void;
  onMouseLeave: (e: maplibregl.MapLayerMouseEvent) => void;
  onClick: (e: maplibregl.MapLayerMouseEvent) => void;
};

type RegionSelectPayload = {
  dataset: RegionDataset;
  featureId: string | number;
}

export type RegionsMapLayersEvents = {
  onRegionSelect?: (payload: RegionSelectPayload) => void;
  onLayerStateSync?: () => void;
}

export class RegionsMapLayers {
  private map: maplibregl.Map;
  private nextColorIndex = 0;
  private layerStates = new Map<string, MapLayerState>();
  private layerStyles = new Map<string, MapLayerStyle>();

  private observedDatasets: RegionDataset[] = [];
  private layerHandler: (() => void) | null = null;
  private styleHandler: (() => void) | null = null;
  private sourceHandler: (() => void) | null = null;

  private events: RegionsMapLayersEvents = {};

  constructor(map: maplibregl.Map) {
    this.map = map;
  }

  setEvents(events: RegionsMapLayersEvents) {
    this.events = events;
  }

  ensureDatasetRendered(dataset: RegionDataset) {
    if (!dataset.isLoaded) {
      console.warn(`[Regions] Cannot render dataset ${dataset.id}: data not loaded`);
      return;
    }

    const datasetIdentifier = RegionDataset.getIdentifier(dataset);
    if (this.layerStates.has(datasetIdentifier)) {
      this.updateMapLayers(dataset, this.layerStates.get(datasetIdentifier)!, 'dark');
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
    this.updateMapLayers(dataset, state, 'dark');
    this.layerStates.set(datasetIdentifier, state)
  }

  toggleVisibility(dataset: RegionDataset) {
    const datasetIdentifier = RegionDataset.getIdentifier(dataset);
    const layerState = this.layerStates.get(datasetIdentifier);
    if (!layerState) {
      console.warn(`[Regions] Cannot toggle visibility for unknown dataset ${datasetIdentifier}`);
      return;
    }
    this.ensureDatasetRendered(dataset);
    layerState.visible = !layerState.visible;
    this.applyVisibility(layerState);
    console.log(`[Regions] Toggled visibility for dataset ${dataset.displayName} to ${layerState.visible}`);
  }

  private applyVisibility(layerState: MapLayerState) {
    const visibility = layerState.visible ? "visible" : "none";
    [
      layerState.boundaryLayerId,
      layerState.boundaryLineLayerId,
      layerState.labelLayerId,
    ].forEach((layerId) => {
      if (layerId && this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, "visibility", visibility);
      }
    });

    if (layerState.visible && layerState.labelLayerId && this.map.getLayer(layerState.labelLayerId)) {
      this.map.moveLayer(layerState.labelLayerId);
    }
  }

  removeDatasetMapLayers(identifier: string) {
    const layerState = this.layerStates.get(identifier);
    if (!layerState) {
      console.warn(`[Regions] Cannot remove map layers for unknown dataset ${identifier}`);
      return;
    }

    if (layerState.handlers) {
      this.detachLayerLabelhandlers(layerState);
    }

    const layersToRemove = [
      layerState.boundaryLayerId,
      layerState.boundaryLineLayerId,
      layerState.labelLayerId,
    ];

    layersToRemove.forEach((layerId) => {
      if (layerId && this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    // Remove sources after corresponding layers are removed
    const sourcesToRemove = [
      layerState.sourceId,
      layerState.labelSourceId,
    ];

    sourcesToRemove.forEach((sourceId) => {
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }
    });

    this.layerStates.delete(identifier);
    this.layerStyles.delete(identifier);
  }

  reset() {
    if (this.layerHandler) {
      this.map.off('data', this.layerHandler);
      this.layerHandler = null;
      this.observedDatasets = [];
    }
    // TODO (Bug 3): Verify that style and source handlers work when map-layering isn't overriden in game.
    if (this.styleHandler) {
      this.map.off('styledata', this.styleHandler);
      this.styleHandler = null;
    }
    if (this.sourceHandler) {
      this.map.off('sourcedata', this.sourceHandler);
      this.sourceHandler = null;
    }
    for (const identifier of this.layerStates.keys()) {
      this.removeDatasetMapLayers(
        identifier,
      );
    };
    this.nextColorIndex = 0;
  }



  // --- Minor Helpers --- //
  isVisible(dataset: RegionDataset): boolean {
    return this.layerStates.get(RegionDataset.getIdentifier(dataset))?.visible ?? false;
  }

  getDatasetToggleOptions(dataset: RegionDataset): LayerToggleOptions {
    return {
      id: dataset.id,
      label: dataset.displayName,
      isVisible: () => this.isVisible(dataset),
      toggle: () => this.toggleVisibility(dataset),
    };
  }

  // --- Layer Render Helpers --- //
  private updateMapLayers(dataset: RegionDataset, layerState: MapLayerState, lightMode: LightMode) {
    this.updateSource(layerState.sourceId, dataset.boundaryData!);
    this.updateSource(layerState.labelSourceId, dataset.labelData!);

    this.addBoundaryLayers(layerState, lightMode);
    this.addLabelLayer(layerState, lightMode);
  }

  private updateSource(sourceId: string, data: GeoJSON.FeatureCollection) {
    if (!this.map.getSource(sourceId)) {
      this.map.addSource(
        sourceId,
        {
          type: 'geojson',
          data: data,
          promoteId: 'ID'
        }
      )
    } else {
      // If map layer source already exists, update data
      console.log(`[Regions] Updating data for source: ${sourceId}`);
      (this.map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
    }
  }

  private determineStyle(datasetIdentifier: string): MapLayerStyle {
    if (this.layerStyles.has(datasetIdentifier)) {
      return this.layerStyles.get(datasetIdentifier)!;
    }

    const color = PRIMARY_FILL_COLORS[this.nextColorIndex % PRIMARY_FILL_COLORS.length];
    this.nextColorIndex++;

    const style: MapLayerStyle = { fillColor: color };
    this.layerStyles.set(datasetIdentifier, style);
    return style;
  }

  private addBoundaryLayers(layerState: MapLayerState, lightMode: LightMode) {
    const boundarySettings = lightMode === 'light' ? DEFAULT_LIGHT_MODE_BOUNDARY_SETTINGS : DEFAULT_DARK_MODE_BOUNDARY_SETTINGS;
    const style = this.determineStyle(layerState.datasetIdentifier);
    if (!this.map.getLayer(layerState.boundaryLayerId)) {
      this.map.addLayer({
        id: layerState.boundaryLayerId,
        type: 'fill',
        source: layerState.sourceId,
        layout: {
          visibility: 'none',
        },
        paint: {
          'fill-color':
            stateBoolean(
              'hover',
              style.fillColor.hover,
              style.fillColor.hex
            ),
          'fill-opacity': stateBoolean(
            'hover',
            HOVER_FILL_OPACITY,
            BASE_FILL_OPACITY
          )
        }
      })
    }

    if (!this.map.getLayer(layerState.boundaryLineLayerId)) {
      this.map.addLayer({
        id: layerState.boundaryLineLayerId,
        type: 'line',
        source: layerState.sourceId,
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
  }

  private addLabelLayer(layerState: MapLayerState, lightMode: LightMode) {
    const labelSettings = lightMode === 'light' ? DEFAULT_LIGHT_MODE_LABEL_SETTINGS : DEFAULT_DARK_MODE_LABEL_SETTINGS;
    if (!this.map.getLayer(layerState.labelLayerId)) {
      this.map.addLayer({
        id: layerState.labelLayerId,
        type: 'symbol',
        source: layerState.labelSourceId,
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
  }

  // --- Label Layer Handlers --- //

  /*
   Currently, custom map layers and sources are removed from the map on certain state changes, namely:
    - Loading an in-game panel that affects the map (e.x. construction menu, demand data panel)
    - Rotating the map view

   To handle this, this function observes the 'data' events on the map object and attempts to reconcile the state of this object and its handlers with the map state
  */
  observeMapLayersForDatasets(datasets: RegionDataset[]) {
    this.observedDatasets = datasets;
    if (this.layerHandler) {
      return;
    }

    // TODO (Bug 3): Re-enable style and source handlers when map-layering isn't overriden in game.

    // this.styleHandler = () => {
    //   this.moveVisibleLabelsToTop();
    // };
    // this.map.on('styledata', this.styleHandler);

    // this.sourceHandler = () => {
    //   this.moveVisibleLabelsToTop();
    // };
    // this.map.on('sourcedata', this.sourceHandler);

    this.layerHandler = () => {
      let syncLayerState = false;
      for (const dataset of this.observedDatasets) {
        const identifier = RegionDataset.getIdentifier(dataset);
        const layerState = this.layerStates.get(identifier);
        if (!layerState) return;
        const hasLayer = this.map.getLayer(layerState.labelLayerId);

        if (hasLayer && !layerState.handlers) {
          this.applyVisibility(layerState);
          this.attachLabelHandlers(dataset);
          console.log(`[Regions] Re-attached label handlers for dataset ${identifier} after layer re-addition`);
          syncLayerState = true;
        }

        if (!hasLayer && layerState.handlers) {
          if (FORCE_HIDE_LAYERS_ON_DROP) {
            layerState.visible = false;
          }
          this.detachLabelHandlers(dataset);
          console.log(`[Regions] Detached label handlers for dataset ${identifier} due to layer removal`);
          syncLayerState = true;
        }
      }

      if (syncLayerState) {
        this.events.onLayerStateSync?.();
      }
    };

    this.map.on('data', this.layerHandler);
  }

  private moveVisibleLabelsToTop(): void {
    for (const dataset of this.observedDatasets) {
      const identifier = RegionDataset.getIdentifier(dataset);
      const layerState = this.layerStates.get(identifier);
      if (!layerState || !layerState.visible) {
        continue;
      }
      if (this.map.getLayer(layerState.labelLayerId)) {
        this.map.moveLayer(layerState.labelLayerId);
      }
    }
  }

  private attachLabelHandlers(dataset: RegionDataset): void {
    const datasetIdentifier = RegionDataset.getIdentifier(dataset);
    const layerState = this.layerStates.get(datasetIdentifier);
    if (!layerState) {
      console.warn(`[Regions] Cannot attach label handlers ${datasetIdentifier}`);
      return;
    }

    const labelLayerId = layerState.labelLayerId;
    const sources = [layerState.sourceId, layerState.labelSourceId];

    if (this.map.getLayer(layerState.labelLayerId) == null) {
      console.warn(`[Regions] Cannot attach label handlers for dataset ${datasetIdentifier}. Label layer: ${layerState.labelLayerId} is not attached`);
      return;
    } else if (layerState.handlers) {
      // Handlers already attached
      return;
    }

    let hoveredId: string | number | undefined = undefined;

    const onMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features?.length || !this.map.getLayer(labelLayerId)) return;
      const featureId = e.features[0].id;
      if (featureId == null) return;

      if (hoveredId !== undefined && hoveredId !== featureId) {
        sources.forEach(sourceId =>
          this.map.setFeatureState(
            { source: sourceId, id: hoveredId },
            { hover: false }
          ));
      }
      hoveredId = featureId;
      sources.forEach(sourceId =>
        this.map.setFeatureState(
          { source: sourceId, id: featureId },
          { hover: true }));
      this.map.getCanvas().style.cursor = 'pointer';
    };

    const onMouseLeave = (e: maplibregl.MapLayerMouseEvent) => {
      if (!this.map.getLayer(labelLayerId)) return;
      if (hoveredId !== undefined) {
        sources.forEach(sourceId =>
          this.map.setFeatureState(
            { source: sourceId, id: hoveredId },
            { hover: false }
          ));
      }
      hoveredId = undefined;
      this.map.getCanvas().style.cursor = '';
    }

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (!this.map.getLayer(labelLayerId)) return;
      if (!e.features?.length) return;
      const feature = e.features[0];
      const featureId = feature.id;
      if (featureId == null) return;
      this.handleRegionSelect(dataset, featureId);
    };

    this.map.on('mousemove', labelLayerId, onMouseMove);
    this.map.on('mouseleave', labelLayerId, onMouseLeave);
    this.map.on('click', labelLayerId, onClick);

    console.log(`[Regions] Attached label handlers for dataset ${datasetIdentifier}`);

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
    this.detachLayerLabelhandlers(layerState);
  }

  private detachLayerLabelhandlers(layerState: MapLayerState): void {
    if (!layerState.handlers) {
      console.warn(`[Regions] Cannot detach label handlers for dataset ${layerState.datasetIdentifier}`);
      return;
    }

    const { onMouseMove, onMouseLeave, onClick } = layerState.handlers;
    const labelLayerId = layerState.labelLayerId;

    this.map.off('mousemove', labelLayerId, onMouseMove);
    this.map.off('mouseleave', labelLayerId, onMouseLeave);
    this.map.off('click', labelLayerId, onClick);

    layerState.handlers = undefined;
  }

  // --- External Event Handlers --- //

  private handleRegionSelect(dataset: RegionDataset, featureId: string | number) {
    if (this.events.onRegionSelect) {
      this.events.onRegionSelect({ dataset, featureId });
    }
  }
}
