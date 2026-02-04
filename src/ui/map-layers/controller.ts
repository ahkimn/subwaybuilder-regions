import { RegionDataset } from "../../core/datasets";
import { RegionsInfoController } from "../info-panel/controller";
import { LayerToggleOptions } from "../types/layer-toggle-options";
import { renderDataset } from "./render";

export class MapLayersController {
  private map: maplibregl.Map;
  private infoController: RegionsInfoController;

  constructor(map: maplibregl.Map, infoController: RegionsInfoController) {
    this.map = map;
    this.infoController = infoController;
  }

  ensureDatasetRendered(dataset: RegionDataset) {
    if (!dataset.loaded) return;

    const layerIds = renderDataset(dataset, this.map);
    dataset.setLayerIds(layerIds);

    this.applyDatasetVisibility(dataset);
  }

  toggleDatasetVisibility(dataset: RegionDataset) {
    dataset.visible = !dataset.visible;
    this.applyDatasetVisibility(dataset);
    console.log(
      `[Regions] Toggled visibility for dataset ${dataset.displayName} to ${dataset.visible}`,
    );
  }

  private applyDatasetVisibility(dataset: RegionDataset) {
    const visibility = dataset.visible ? "visible" : "none";

    [
      dataset.boundaryLayerId,
      dataset.boundaryLineLayerId,
      dataset.labelLayerId,
    ].forEach((layerId) => {
      if (layerId && this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, "visibility", visibility);
      }
    });

    if (dataset.visible && dataset.labelLayerId) {
      this.map.moveLayer(dataset.labelLayerId);
    }
  }

  removeDatasetMapLayers(dataset: RegionDataset) {
    const layersToRemove = [
      dataset.boundaryLayerId,
      dataset.boundaryLineLayerId,
      dataset.labelLayerId,
    ];

    layersToRemove.forEach((layerId) => {
      if (layerId && this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    // Remove sources AFTER layers
    const sources = [
      `${dataset.getSourcePrefix()}-boundaries`,
      `${dataset.getSourcePrefix()}-labels`,
    ];

    sources.forEach((sourceId) => {
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }
    });

    dataset.clearLayerIds();
  }

  getDatasetToggleOptions(dataset: RegionDataset): LayerToggleOptions {
    return {
      id: dataset.id,
      label: dataset.displayName,
      isVisible: () => dataset.visible,
      toggle: () => this.toggleDatasetVisibility(dataset),
    };
  }
}
