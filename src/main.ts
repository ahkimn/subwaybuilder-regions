
const api = window.SubwayBuilderAPI;
const DATA_DIR = '/Users/AlexK/Github/subwaybuilder-additional-statistics/data';

if (!api) {
  console.error("[Additional Statistics] API not available");
}

const latLngBuffer = 0.05; // Approximately 5km for US/GB latitudes

const regionUnitedStates = "US";
const regionGreatBritain = "GB";

let cityCode: String;


api.hooks.onMapReady(async (map) => {

  const bounds = map.getMaxBounds() || map.getBounds();
  const swBounds = bounds.getSouthWest();
  const neBounds = bounds.getNorthEast();

  map.queryRenderedFeatures();


  console.log('[Additional Statistics] Map ready. Boundaries SW:', [swBounds.lat, swBounds.lng], 'NE:', [neBounds.lat, neBounds.lng]);

  console.log('[Additional Statistics] Loading districts:')
  const testPath = `${DATA_DIR}/england_districts.geojson`;

  const json = await fetch(testPath).then((r) => r.json());

  console.log('[Additional Statistics] Finished Loading districts:');


});


api.ui.showNotification("Additional Statistics loaded!", "success");
console.log("[Additional Statistics] Loaded");
