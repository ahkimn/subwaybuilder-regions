import type { ModdingAPI } from '@lib/types/api';

export type ActivationContext = {
  cityCode: string;
  map: maplibregl.Map;
  /**
   * Returns false if this activation has been superseded by a newer city load
   * or map rebind. Use as a staleness guard inside async activation work:
   *
   *   onActivate: ({ cityCode, isCurrent }) => {
   *     await someAsyncWork();
   *     if (!isCurrent()) return;
   *     // safe to activate
   *   }
   */
  isCurrent: () => boolean;
};

export type ModLifecycleCallbacks = {
  /**
   * Called when both a city is loaded and the map is ready. May fire again if
   * the map is rebound (e.g. after hot-reload). Implementations should be safe
   * to call multiple times for the same city — use `isCurrent()` to guard
   * against stale async work.
   */
  onActivate: (context: ActivationContext) => void | Promise<void>;
  /**
   * Called when the active city is being torn down — either during a
   * city-switch or immediately before `onGameEnd`. Receives the city code
   * that is being deactivated.
   */
  onDeactivate: (cityCode: string) => void;
  /**
   * Called after `onDeactivate` when the game session ends. Use for
   * session-level teardown that should only happen at game end (e.g.
   * re-registering main-menu UI components).
   */
  onGameEnd: () => void;
  /** Log prefix for console messages, e.g. "[MyMod]". */
  logPrefix?: string;
};

/**
 * Manages the game lifecycle for a mod: tracks the active city and map,
 * coordinates activation when both are present, and handles hot-reload
 * reconciliation when hooks do not replay on mod re-initialization.
 *
 * Usage:
 *
 *   const lifecycle = new ModLifecycle(api, {
 *     logPrefix: '[MyMod]',
 *     onActivate: ({ cityCode, map, isCurrent }) => { ... },
 *     onDeactivate: (cityCode) => { ... },
 *     onGameEnd: () => { ... },
 *   });
 *
 *   lifecycle.register();       // wire up api.hooks
 *   await asyncInitWork();
 *   lifecycle.reconcile();      // recover state for hot-reload
 */
export class ModLifecycle {
  private _currentCityCode: string | null = null;
  private _map: maplibregl.Map | null = null;
  private _cityLoadToken = 0;
  private _mapReadyToken = 0;
  private readonly logPrefix: string;

  constructor(
    private readonly api: ModdingAPI,
    private readonly callbacks: ModLifecycleCallbacks,
  ) {
    this.logPrefix = callbacks.logPrefix ?? '[ModLifecycle]';
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Wire lifecycle hooks with the game API. Call once during mod initialization. */
  register(): void {
    this.api.hooks.onCityLoad(this.handleCityLoad.bind(this));
    this.api.hooks.onMapReady(this.handleMapReady.bind(this));
    this.api.hooks.onGameEnd(this.handleGameEnd.bind(this));
  }

  /**
   * Reconcile lifecycle state after async initialization completes.
   *
   * Handles two hot-reload scenarios:
   * - Neither hook replayed: recovers map + city from API and triggers activation.
   * - `onCityLoad` replayed but `onMapReady` did not: recovers map from API.
   *
   * Safe to call when no recovery is needed — exits early if the lifecycle is
   * already active.
   */
  reconcile(): void {
    if (this._cityLoadToken > 0) {
      // City load hook already fired. If the map is still missing (e.g. onMapReady
      // did not replay), recover it from the API and trigger activation.
      if (!this._map) {
        const mapFromApi = this.api.utils.getMap();
        if (mapFromApi) {
          console.info(
            `${this.logPrefix} Reconciled map from API after city load`,
          );
          this.handleMapReady(mapFromApi);
        }
      }
      return;
    }

    // No city load hook has fired yet. Attempt full recovery from the API.
    const mapFromApi = this.api.utils.getMap();
    if (mapFromApi && !this._map) {
      this._map = mapFromApi;
      console.info(`${this.logPrefix} Reconciled map from API`);
    }

    const cityCode = this.api.utils.getCityCode();
    if (cityCode) {
      console.info(
        `${this.logPrefix} Reconciled city code from API: ${cityCode}`,
      );
      this.handleCityLoad(cityCode);
    }
  }

  get currentCityCode(): string | null {
    return this._currentCityCode;
  }

  get activeMap(): maplibregl.Map | null {
    return this._map;
  }

  // ---------------------------------------------------------------------------
  // Hook handlers
  // ---------------------------------------------------------------------------

  private handleCityLoad(cityCode: string): void {
    const loadToken = ++this._cityLoadToken;

    if (this._currentCityCode && this._currentCityCode !== cityCode) {
      console.warn(
        `${this.logPrefix} City switch: ${this._currentCityCode} → ${cityCode}; deactivating`,
      );
      this.callbacks.onDeactivate(this._currentCityCode);
    }

    this._currentCityCode = cityCode;
    console.log(`${this.logPrefix} City load: ${cityCode} (token=${loadToken})`);

    if (this._map) {
      void this.callbacks.onActivate({
        cityCode,
        map: this._map,
        isCurrent: () => loadToken === this._cityLoadToken,
      });
    }
  }

  private handleMapReady(map: maplibregl.Map | null): void {
    const mapToken = ++this._mapReadyToken;
    const resolvedMap = map ?? this.api.utils.getMap();

    if (!resolvedMap) {
      console.warn(`${this.logPrefix} onMapReady: no map instance available`);
      return;
    }

    if (this._map && this._map !== resolvedMap) {
      console.warn(`${this.logPrefix} onMapReady: new map instance; rebound`);
    }

    this._map = resolvedMap;
    console.log(`${this.logPrefix} Map ready (token=${mapToken})`);

    if (this._currentCityCode) {
      // Capture the token at map-ready time so that a subsequent city load
      // invalidates this activation's isCurrent predicate.
      const cityToken = this._cityLoadToken;
      void this.callbacks.onActivate({
        cityCode: this._currentCityCode,
        map: this._map,
        isCurrent: () => cityToken === this._cityLoadToken,
      });
    } else if (this._cityLoadToken === 0) {
      // Hot-reload: city load hook did not replay. Recover from the API.
      const cityCode = this.api.utils.getCityCode();
      if (cityCode) {
        this.handleCityLoad(cityCode);
      }
    }
  }

  private async handleGameEnd(result?: unknown): Promise<void> {
    // Await the result before any teardown. The game passes a Promise as
    // `result` that resolves once the main menu is re-initialized. Deferring
    // until after resolution ensures that component re-registrations (e.g.
    // reattaching the settings button) happen after the main menu is ready —
    // otherwise the game's own initialization wipes freshly registered
    // components. This mirrors the pattern in the Regions mod.
    await result;

    console.log(`${this.logPrefix} Game end`);

    if (this._currentCityCode) {
      this.callbacks.onDeactivate(this._currentCityCode);
      this._currentCityCode = null;
    }

    this._cityLoadToken = 0;
    this._mapReadyToken = 0;
    this._map = null;

    this.callbacks.onGameEnd();
  }
}
