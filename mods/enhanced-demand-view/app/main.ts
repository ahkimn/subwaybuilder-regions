// Enhanced Demand View mod entry point
// TODO: Implement mod logic

const api = window.SubwayBuilderAPI;

export class EnhancedDemandViewMod {
  constructor() {
    // No storage/database support — lightweight mod
  }

  async initialize() {
    console.log('[EnhancedDemandView] Initializing Mod');

    if (!api) {
      console.error('[EnhancedDemandView] API not available');
      return;
    }

    api.on('cityLoad', (cityCode: string) => this.onCityLoad(cityCode));
    api.on('mapReady', (map: unknown) => this.onMapReady(map));
    api.on('gameEnd', () => this.onGameEnd());
  }

  async onCityLoad(cityCode: string) {
    console.log(`[EnhancedDemandView] City loaded: ${cityCode}`);
  }

  onMapReady(_map: unknown) {
    console.log('[EnhancedDemandView] Map ready');
  }

  onGameEnd() {
    console.log('[EnhancedDemandView] Game ended');
  }
}

// Instantiate and initialize
const mod = new EnhancedDemandViewMod();
mod.initialize();
