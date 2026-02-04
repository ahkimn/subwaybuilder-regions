
import { RegionsInfoController } from './ui/info-panel/controller';
import { resolveInfoPanelRoot } from './ui/resolve-elements';
import { observeInfoPanelsRoot, observeMapLayersPanel } from './ui/observers';
import { RegionDatasetRegistry } from './core/dataset-registry';
import { injectRegionToggles } from './ui/map-layers/toggles';
import { observeDatasetMapLayers } from './ui/map-layers/handlers';
import { MapLayersController } from './ui/map-layers/controller';

const SERVE_URL = 'http://127.0.0.1:8080/'
const INDEX_FILE = `${SERVE_URL}/index.json`;

const REGIONS_INFO_PANEL_ID = 'regions-info-panel';

const api = window.SubwayBuilderAPI;

const RegionsMod = {

  registry: new RegionDatasetRegistry(INDEX_FILE, SERVE_URL),
  currentCityCode: null as string | null,
  map: null as maplibregl.Map | null,

  layerPanelObserver: null as MutationObserver | null,
  lastInjectedCity: null as string | null,
  layerPanelRoot: null as HTMLElement | null,

  infoPanelsRoot: null as HTMLElement | null,
  regionsInfoController: null as RegionsInfoController | null,
  mapLayersController: null as MapLayersController | null,

  async initialize() {

    console.log("[Regions] Initializing Mod");

    if (!api) {
      console.error("[Regions] API not available");
      return;
    }

    // Build dataset registry from data index file. 
    // TODO: replace with local mod storage
    await this.registry.build();

    this.regionsInfoController = new RegionsInfoController(REGIONS_INFO_PANEL_ID,
      this.getInfoPanelRoot.bind(this)
    );

    api.hooks.onCityLoad(this.onCityLoad.bind(this));
    api.hooks.onMapReady(this.onMapReady.bind(this));

    this.layerPanelObserver = observeMapLayersPanel((panel) => {
      this.layerPanelRoot = panel;
      this.tryInjectLayerPanelUI();
    });

    observeInfoPanelsRoot(this.getInfoPanelRoot.bind(this), this.regionsInfoController!.clear.bind(this.regionsInfoController));

    console.log("[Regions] Mod Initialized");
  },

  getInfoPanelRoot(): HTMLElement | null {
    if (!this.infoPanelsRoot && document.contains(this.infoPanelsRoot)) {
      return this.infoPanelsRoot;
    }

    this.infoPanelsRoot = resolveInfoPanelRoot();
    return this.infoPanelsRoot;
  },

  toggleDatasetVisibility(name: string) {
    const dataset = this.registry.getDatasetByCityAndName(this.currentCityCode!, name);

    if (!dataset || !this.map) {
      console.warn(`[Regions] Cannot toggle visibility for dataset ${name}`);
      return;
    }

    // Retrigger render in case layers/source have been unloaded from the map
    this.mapLayersController!.ensureDatasetRendered(dataset);
    this.mapLayersController!.toggleDatasetVisibility(dataset);
  },

  async onMapReady(map: maplibregl.Map) {
    this.map = map;
    this.mapLayersController = new MapLayersController(map, this.regionsInfoController!);
    // map.on('click', (e) => {
    //   console.log('[Regions] Map clicked at ', e.lngLat);
    //   console.log(`${this.currentCityCode}, ${this.map?.getBounds().getSouth()}, ${this.map?.getBounds().getWest()}, ${this.map?.getBounds().getNorth()}, ${this.map?.getBounds().getEast()}`);
    // })
    this.getInfoPanelRoot();
    this.tryLoadMapLayers();
  },

  async onCityLoad(cityCode: string) {
    // TODO: Add mechanism to determine BoundaryBox from SubwayBuilderAPI for dynamic generation of datasets
    this.reset();
    this.currentCityCode = cityCode;
    await this.registry.loadCityDatasets(cityCode);
    api.ui.showNotification("[Regions] City data loaded", "success");
    this.tryLoadMapLayers();
  },

  tryLoadMapLayers() {
    // Ensure map and at least one region dataset is available
    if (!this.map) {
      console.warn("[Regions] Map not ready");
      return;
    }
    if (!this.registry.getCityDatasets(this.currentCityCode!)) {
      console.warn("[Regions] No region data available to load onto map");
      return;
    }

    // Ensure map layers are only loaded once
    if ((this as any).loadedMapLayers) return;
    (this as any).loadedMapLayers = true;

    const cityDatasets = this.registry.getCityDatasets(this.currentCityCode!)

    console.log("[Regions] Map layers loaded");
    console.log("[Regions] Available layers: ", cityDatasets.map(ds => ds.displayName).join(', '));

    for (const dataset of cityDatasets) {
      observeDatasetMapLayers(dataset, this.map, this.regionsInfoController!);
    };

    this.tryInjectLayerPanelUI();
  },

  tryInjectLayerPanelUI() {
    if (!this.layerPanelRoot || !this.currentCityCode) return;

    const cityDatasets = this.registry.getCityDatasets(this.currentCityCode!);

    if (this.lastInjectedCity === this.currentCityCode) return;
    this.lastInjectedCity = this.currentCityCode;

    cityDatasets.forEach(ds => {
      this.mapLayersController!.ensureDatasetRendered(ds);
    });
    const toggleOptions = cityDatasets.map((ds) => this.mapLayersController!.getDatasetToggleOptions(ds));
    
    injectRegionToggles(this.layerPanelRoot, toggleOptions);
    console.log('[Regions] Layer panel UI injected');
  },

  reset() {
    if (this.currentCityCode) {
      const cityDatasets = this.registry.getCityDatasets(this.currentCityCode);
      for (const dataset of cityDatasets) {
        dataset.unloadData();
        this.mapLayersController!.removeDatasetMapLayers(dataset);
      }
    }
    this.currentCityCode = null;
    this.lastInjectedCity = null;
    (this as any).loadedMapLayers = false;
  },

  // -- Debugging --
  printRegistry() {
    this.registry.printIndex();
  },
};

(window as any).SubwayBuilderRegions = RegionsMod;

RegionsMod.initialize();
