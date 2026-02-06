import { RegionDataset } from "../core/datasets/RegionDataset";
import { DisplayColor, PRIMARY_FILL_COLORS } from "../ui/types/DisplayColor";
import { LayerToggleOptions } from "../ui/types/LayerToggleOptions";
import { BASE_FILL_OPACITY, DEFAULT_DARK_MODE_BOUNDARY_SETTINGS, DEFAULT_DARK_MODE_LABEL_SETTINGS, DEFAULT_LIGHT_MODE_BOUNDARY_SETTINGS, DEFAULT_LIGHT_MODE_LABEL_SETTINGS, HOVER_FILL_OPACITY, LightMode, stateBoolean } from "./default-settings";

type MapLayersState = {
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
}

export class RegionsMapLayers {
  private map: maplibregl.Map;
  private nextColorIndex = 0;
  private layers = new Map<string, MapLayersState>();
  private styles = new Map<string, MapLayerStyle>();

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

    const datasetIdentifier = dataset.getIdentifier();
    if (this.layers.has(datasetIdentifier)) {
      this.updateMapLayers(dataset, this.layers.get(datasetIdentifier)!, 'dark');
      return;
    }

    const sourceId = `${dataset.getSourcePrefix()}-boundaries`;
    const labelSourceId = `${dataset.getSourcePrefix()}-labels`;
    const boundaryLayerId = `${dataset.getLayerPrefix()}-boundary-fill`;
    const boundaryLineLayerId = `${dataset.getLayerPrefix()}-boundary-outline`;
    const labelLayerId = `${dataset.getLayerPrefix()}-label`;

    const state: MapLayersState = {
      datasetIdentifier,
      sourceId,
      labelSourceId,
      boundaryLayerId,
      boundaryLineLayerId,
      labelLayerId,
      visible: false,
    };
    this.updateMapLayers(dataset, state, 'dark');
    this.layers.set(datasetIdentifier, state)
  }

  toggleVisibility(dataset: RegionDataset) {
    const datasetIdentifier = dataset.getIdentifier();
    const state = this.layers.get(datasetIdentifier);
    if (!state) {
      console.warn(`[Regions] Cannot toggle visibility for unknown dataset ${datasetIdentifier}`);
      return;
    }
    this.ensureDatasetRendered(dataset);
    state.visible = !state.visible;
    this.applyVisibility(state);
    console.log(`[Regions] Toggled visibility for dataset ${dataset.displayName} to ${state.visible}`);
  }

  private applyVisibility(state: MapLayersState) {
    const visibility = state.visible ? "visible" : "none";
    [
      state.boundaryLayerId,
      state.boundaryLineLayerId,
      state.labelLayerId,
    ].forEach((layerId) => {
      if (layerId && this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, "visibility", visibility);
      }
    });

    if (state.visible && state.labelLayerId) {
      this.map.moveLayer(state.labelLayerId);
    }
  }

  removeDatasetMapLayers(identifier: string) {
    const state = this.layers.get(identifier);
    if (!state) {
      console.warn(`[Regions] Cannot remove map layers for unknown dataset ${identifier}`);
      return;
    }

    const layersToRemove = [
      state.boundaryLayerId,
      state.boundaryLineLayerId,
      state.labelLayerId,
    ];

    layersToRemove.forEach((layerId) => {
      if (layerId && this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    // Remove sources after corresponding layers are removed
    const sourcesToRemove = [
      state.sourceId,
      state.labelSourceId,
    ];

    sourcesToRemove.forEach((sourceId) => {
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }
    });

    this.layers.delete(identifier);
    this.styles.delete(identifier);
  }

  reset() {
    for (const identifier of this.layers.keys()) {
      this.removeDatasetMapLayers(
        identifier,
      );
    };
    this.nextColorIndex = 0;
  }



  // --- Minor Helpers --- //
  isVisible(dataset: RegionDataset): boolean {
    return this.layers.get(dataset.getIdentifier())?.visible ?? false;
  }

  getDatasetToggleOptions(dataset: RegionDataset): LayerToggleOptions {
    return {
      id: dataset.id,
      label: dataset.displayName,
      isVisible: () => this.isVisible(dataset),
      toggle: () => this.toggleVisibility(dataset),
      // TODO: On map layer reset, ensure toggle state is synced
    };
  }

  // --- Layer Render Helpers --- //
  private updateMapLayers(dataset: RegionDataset, state: MapLayersState, lightMode: LightMode) {
    this.updateSource(state.sourceId, dataset.boundaryData!);
    this.updateSource(state.labelSourceId, dataset.labelData!);

    this.addBoundaryLayers(state, lightMode);
    this.addLabelLayer(state, lightMode);
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
    if (this.styles.has(datasetIdentifier)) {
      return this.styles.get(datasetIdentifier)!;
    }

    const color = PRIMARY_FILL_COLORS[this.nextColorIndex % PRIMARY_FILL_COLORS.length];
    this.nextColorIndex++;

    const style: MapLayerStyle = { fillColor: color };
    this.styles.set(datasetIdentifier, style);
    return style;
  }

  private addBoundaryLayers(state: MapLayersState, lightMode: LightMode) {
    const boundarySettings = lightMode === 'light' ? DEFAULT_LIGHT_MODE_BOUNDARY_SETTINGS : DEFAULT_DARK_MODE_BOUNDARY_SETTINGS;
    const style = this.determineStyle(state.datasetIdentifier);
    if (!this.map.getLayer(state.boundaryLayerId)) {
      this.map.addLayer({
        id: state.boundaryLayerId,
        type: 'fill',
        source: state.sourceId,
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

    if (!this.map.getLayer(state.boundaryLineLayerId)) {
      this.map.addLayer({
        id: state.boundaryLineLayerId,
        type: 'line',
        source: state.sourceId,
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

  private addLabelLayer(state: MapLayersState, lightMode: LightMode) {
    const labelSettings = lightMode === 'light' ? DEFAULT_LIGHT_MODE_LABEL_SETTINGS : DEFAULT_DARK_MODE_LABEL_SETTINGS;
    if (!this.map.getLayer(state.labelLayerId)) {
      this.map.addLayer({
        id: state.labelLayerId,
        type: 'symbol',
        source: state.labelSourceId,
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
    this.map.on('data', () => {
      for (const dataset of datasets) {
        const state = this.layers.get(dataset.getIdentifier());
        if (!state) return;
        const hasLayer = this.map.getLayer(state.labelLayerId);

        if (hasLayer && !state.handlers) {
          this.attachLabelHandlers(dataset);
          console.log(`[Regions] Re-attached label handlers for dataset ${dataset.getIdentifier()} after layer re-addition`);
        }

        if (!hasLayer && state.handlers) {
          this.detachLabelHandlers(dataset);
          console.log(`[Regions] Detached label handlers for dataset ${dataset.getIdentifier()} due to layer removal`);
        }
      }
    });
  }

  private attachLabelHandlers(dataset: RegionDataset): void {
    const datasetIdentifier = dataset.getIdentifier();
    const state = this.layers.get(datasetIdentifier);
    if (!state) {
      console.warn(`[Regions] Cannot attach label handlers ${datasetIdentifier}`);
      return;
    }

    const labelLayerId = state.labelLayerId;
    const sources = [state.sourceId, state.labelSourceId];

    if (this.map.getLayer(state.labelLayerId) == null) {
      console.warn(`[Regions] Cannot attach label handlers for dataset ${datasetIdentifier}. Label layer: ${state.labelLayerId} is not attached`);
      return;
    } else if (state.handlers) {
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

    state.handlers = {
      hoveredId,
      onMouseMove,
      onMouseLeave,
      onClick,
    };
  }

  private detachLabelHandlers(dataset: RegionDataset): void {
    const state = this.layers.get(dataset.getIdentifier())!;
    if (!state.handlers) {
      console.warn(`[Regions] Cannot detach label handlers for dataset ${dataset.getIdentifier()}`);
      return;
    }

    const { onMouseMove, onMouseLeave, onClick } = state.handlers;
    const labelLayerId = state.labelLayerId;

    this.map.off('mousemove', labelLayerId, onMouseMove);
    this.map.off('mouseleave', labelLayerId, onMouseLeave);
    this.map.off('click', labelLayerId, onClick);

    state.handlers = undefined;
  }

  // --- External Event Handlers --- //

  private handleRegionSelect(dataset: RegionDataset, featureId: string | number) {
    if (this.events.onRegionSelect) {
      this.events.onRegionSelect({ dataset, featureId });
    }
  }
}
