import { RegionDataset } from "../core/datasets/RegionDataset";
import { RegionsInfoPanel } from "../ui/panels/info/RegionsInfoPanel";

export function setupLabelHandlers(dataset: RegionDataset, map: maplibregl.Map, controller: RegionsInfoPanel): void {
  const labelLayerId = dataset.labelLayerId!;

  const sources = [
    `${dataset.getSourcePrefix()}-labels`,
    `${dataset.getSourcePrefix()}-boundaries`
  ];

  let hoveredId: string | number | undefined = undefined;

  const onMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
    if (!e.features?.length || !map.getLayer(labelLayerId)) return;
    const featureId = e.features[0].id;
    if (featureId == null) return;

    if (hoveredId !== undefined && hoveredId !== featureId) {
      sources.forEach(sourceId =>
        map.setFeatureState(
          { source: sourceId, id: hoveredId },
          { hover: false }
        ));
    }
    hoveredId = featureId;
    sources.forEach(sourceId =>
      map.setFeatureState(
        { source: sourceId, id: featureId },
        { hover: true }));
    map.getCanvas().style.cursor = 'pointer';
  };

  const onMouseLeave = (e: maplibregl.MapLayerMouseEvent) => {
    if (!map.getLayer(labelLayerId)) return;
    if (hoveredId !== undefined) {
      sources.forEach(sourceId =>
        map.setFeatureState(
          { source: sourceId, id: hoveredId },
          { hover: false }
        ));
    }
    hoveredId = undefined;
    map.getCanvas().style.cursor = '';
  }

  const onClick = (e: maplibregl.MapLayerMouseEvent) => {
    console.log(e.features);
    if (!map.getLayer(labelLayerId)) return;
    if (!e.features?.length) return;
    const feature = e.features[0];
    const featureId = feature.id;
    if (featureId == null) return;
    controller.showFeatureData(dataset, featureId);
  };

  map.on('mousemove', labelLayerId, onMouseMove);
  map.on('mouseleave', labelLayerId, onMouseLeave);
  map.on('click', labelLayerId, onClick);

  dataset.labelLayerListeners.push(
    { eventType: 'mousemove', handler: onMouseMove },
    { eventType: 'mouseleave', handler: onMouseLeave },
    { eventType: 'click', handler: onClick }
  );
}

export function clearHandlers(
  dataset: RegionDataset,
  map: maplibregl.Map
): void {
  const labelLayerId = dataset.labelLayerId!;

  dataset.labelLayerListeners.forEach((listener) => {
    map.off(listener.eventType, labelLayerId, listener.handler);
  });

  dataset.labelLayerListeners = [];
}

export function observeDatasetMapLayers(
  dataset: RegionDataset,
  map: maplibregl.Map,
  controller: RegionsInfoPanel
): void {
  // Handle when layers are removed outside of the mod
  const reconcile = () => {

    // Reconcile event handlers
    const labelLayerPresent = map.getLayer(dataset.labelLayerId!);
    if (!labelLayerPresent) {
      if (dataset.labelLayerListeners.length > 0) {
        console.log(`[Regions] Label layer for dataset ${dataset.id} no longer present on map, clearing label event handlers.`);
        clearHandlers(dataset, map);
      }

    } else {
      if (dataset.labelLayerListeners.length === 0) {
        console.log(`[Regions] Label layer for dataset ${dataset.id} present on map without label event handlers.`);
        setupLabelHandlers(dataset, map, controller);
      }
    }
  }

  map.on('data', reconcile);
}