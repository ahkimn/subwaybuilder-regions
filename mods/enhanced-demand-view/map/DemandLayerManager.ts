/**
 * Replaces the game's `demand-points` deck.gl layer with a native MapLibre
 * circle layer that we fully control.
 *
 * ## Why
 * The game's demand layer is a deck.gl GeoJsonLayer wrapped in a MapboxLayer
 * adapter. Every mouse movement triggers a React re-render → setProps call on
 * the deck.gl layer, even when the layer is hidden. This is a known game
 * performance issue. By replacing it with a native MapLibre circle layer:
 *
 *   - MapLibre skips the layer entirely when hidden — no rendering, no event
 *     callbacks, no deck.gl overhead.
 *   - We control when colors are recomputed (user-triggered refresh) rather
 *     than per-frame.
 *   - We control dot radius independently of the game's `d.properties.size`
 *     accessor.
 *
 * ## Coloring
 * Colors are baked into the GeoJSON feature properties at source-update time
 * by calling the game's own `getFillColor` accessor directly. Since the
 * accessor is a closure over `mapMode` and `isDark`, calling it at any time
 * reflects current game state. This means colors update correctly on the next
 * `refreshColors()` call without us needing to replicate the game's color
 * logic.
 *
 * ## Layer structure (confirmed at runtime)
 * map.getLayer('demand-points')
 *   → Mc (maplibre CustomLayer wrapper)
 *       .implementation → MapboxLayer (deck.gl ↔ MapLibre adapter)
 *           .props      → { getPointRadius, getFillColor, getLineColor,
 *                           getLineWidth, onClick, visible, updateTriggers, … }
 *           .setProps() → rebuilds the internal GeoJsonLayer
 *
 * ## Lifecycle
 * - attach()         Call once per map instance on city activation.
 * - detach()         Call on city deactivation / game end.
 * - refreshColors()  Call to recompute fill colors using current game state.
 */

import { SystemPerformanceMonitor } from '@enhanced-demand-view/map/SystemPerformanceMonitor';
import {
  type ResourceCounts,
  WebGLResourceTracker,
} from '@enhanced-demand-view/map/WebGLResourceTracker';

const GAME_LAYER_ID = 'demand-points';
const EDV_SOURCE_ID = 'edv-demand-source';
const EDV_LAYER_ID = 'edv-demand-points';
const LOG = '[EnhancedDemandView][DemandLayerManager]';

// Default dot radius in pixels. Will be driven by mod settings in future.
const DEFAULT_RADIUS_PX = 6;

// deck.gl MapboxLayer adapter — only the members we use.
type MapboxLayerImpl = {
  props: Record<string, unknown>;
  setProps(props: Record<string, unknown>): void;
};

// The maplibre internal CustomLayer wrapper returned by map.getLayer().
type CustomLayerMc = {
  id: string;
  type: 'custom';
  implementation?: MapboxLayerImpl;
};

// Shape of the game's getFillColor accessor for demand point features.
// Returns [r, g, b, a] with components in 0–255 range.
type GameFillColorFn = (
  feature: GeoJSON.Feature,
) => [number, number, number, number];

// Shape of the game's click handler.
type GameClickFn = (info: { object: { properties: { id: string } } }) => void;

type CapturedGameLayer = {
  impl: MapboxLayerImpl;
  getFillColor: GameFillColorFn;
  onClick: GameClickFn;
};

type MemorySnapshot = {
  event: string;
  timestamp: number;
  heapUsedMB: number;
  tileCacheEntries: number;
  domNodeCount: number;
  webglNet: ResourceCounts | null;
};

type PatchedMapMethods = {
  addLayer: maplibregl.Map['addLayer'];
  removeLayer: maplibregl.Map['removeLayer'];
};

export class DemandLayerManager {
  private patched: PatchedMapMethods | null = null;
  private captured: CapturedGameLayer | null = null;
  private originalSetProps: ((props: Record<string, unknown>) => void) | null =
    null;

  // Feature data from the last game setProps call that included `data`.
  // Retained so refreshColors() can recompute without waiting for the next update.
  private cachedFeatures: GeoJSON.Feature[] = [];

  // Diagnostics: track data-update call timing and trigger changes.
  private lastDataUpdateMs: number | null = null;
  private lastUpdateTriggerSerialized: string | null = null;
  private dataUpdateCount = 0;

  // Render optimisation: stored pre-attach values for clean restore on detach.
  private previousRenderWorldCopies: boolean | null = null;

  // Cached tile-breakdown string to suppress redundant per-capture logs.
  private lastTileBreakdownSummary = '';

  // Memory leak detection: track demand view open/close transitions and the
  // memory state at each transition, to identify if usage grows per cycle.
  private lastRequestedVisible: boolean | null = null;
  private webglTracker: WebGLResourceTracker | null = null;
  private perfMonitor: SystemPerformanceMonitor | null = null;
  private perfPeriodicHandle: ReturnType<typeof setInterval> | null = null;
  private memorySnapshots: Array<MemorySnapshot> = [];

  // Stored so we can call map.off() precisely on detach.
  private clickHandler: ((e: maplibregl.MapLayerMouseEvent) => void) | null =
    null;

  constructor(
    private readonly map: maplibregl.Map,
    private readonly radiusPx: number = DEFAULT_RADIUS_PX,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  attach(): void {
    this.patchMapMethods();
    this.probeAndApplyMapRenderSettings();
    this.startWebGLTracker();
    this.startPerfMonitor();

    // If the game already added the layer before we attached (hot-reload or
    // map-ready fires after city-load), take it over immediately.
    const existing = this.map.getLayer(GAME_LAYER_ID) as
      | CustomLayerMc
      | undefined;
    if (existing?.implementation) {
      console.log(`${LOG} Game layer already present — taking over`);
      this.takeoverImpl(existing.implementation);
    } else {
      console.log(`${LOG} Waiting for game to add '${GAME_LAYER_ID}'`);
    }
  }

  // ---------------------------------------------------------------------------
  // WebGL resource tracking (GPU leak detection)
  // ---------------------------------------------------------------------------

  private startWebGLTracker(): void {
    const gl = this.resolveGLContext();
    if (!gl) {
      console.warn(
        `${LOG} No WebGL context — GPU resource tracking unavailable`,
      );
      return;
    }
    this.webglTracker = new WebGLResourceTracker(gl);
    this.webglTracker.start();
    console.log(`${LOG} WebGL resource tracker started`);
  }

  private stopWebGLTracker(): void {
    this.webglTracker?.stop();
    this.webglTracker = null;
  }

  private startPerfMonitor(): void {
    const gl = this.resolveGLContext();
    this.perfMonitor = new SystemPerformanceMonitor(gl);
    this.perfMonitor.start();

    // Independent periodic log — captures degradation between toggles.
    this.perfPeriodicHandle = setInterval(() => {
      if (this.perfMonitor) {
        console.log(`${LOG} [perf] ${this.perfMonitor.summary()}`);
      }
    }, 5_000);
    console.log(`${LOG} System performance monitor started`);
  }

  private stopPerfMonitor(): void {
    if (this.perfPeriodicHandle !== null) {
      clearInterval(this.perfPeriodicHandle);
      this.perfPeriodicHandle = null;
    }
    this.perfMonitor?.stop();
    this.perfMonitor = null;
  }

  private resolveGLContext():
    | WebGLRenderingContext
    | WebGL2RenderingContext
    | null {
    const canvas = this.map.getCanvas();
    return (
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null)
    );
  }

  // ---------------------------------------------------------------------------
  // Map render settings probe
  // ---------------------------------------------------------------------------

  /**
   * Logs MapLibre render settings relevant to memory and GPU load.
   * Useful context for diagnosing OOM issues caused by tile cache pressure
   * against the V8 memory cage (~4GB ceiling in Electron).
   *
   * Non-public API fields are accessed reflectively — values are read-only
   * and nothing is mutated.
   */
  /**
   * Probes MapLibre render settings relevant to the V8 memory cage OOM issue,
   * then applies the two levers available at runtime:
   *
   * - renderWorldCopies: false — eliminates duplicate tile loads for map edges.
   *   Restored to the game's original value on detach().
   * - setMaxTileCacheSize(N) — bounds the tile ArrayBuffer cache. Only applied
   *   if the setter exists in this MapLibre version. Not restored (bounded is
   *   strictly better; game default is unlimited).
   *
   * Read-only observations (cannot be changed post-init):
   * - antialias: MSAA framebuffer cost, must be addressed at game init level.
   * - WebGL MAX_TEXTURE_SIZE: GPU capability reference.
   */
  private probeAndApplyMapRenderSettings(): void {
    const mapAsAny = this.map as unknown as Record<string, unknown>;

    // --- Probe ---

    const renderWorldCopies = this.map.getRenderWorldCopies();

    const mapWithOptionalMethods = this.map as unknown as {
      getMaxTileCacheSize?(): number | null;
      setMaxTileCacheSize?(n: number): void;
    };
    const maxTileCacheSize =
      mapWithOptionalMethods.getMaxTileCacheSize?.() ?? '(getter unavailable)';

    const antialias = mapAsAny['_antialias'] ?? '(unknown)';

    const canvas = mapAsAny['_canvas'] as HTMLCanvasElement | undefined;
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    const maxTextureSize = gl
      ? (gl as WebGLRenderingContext).getParameter(
          (gl as WebGLRenderingContext).MAX_TEXTURE_SIZE,
        )
      : '(no gl context)';

    const tileCacheEntries = this.getTileCacheEntries();

    console.group(`${LOG} [probe] MapLibre render settings (pre-apply)`);
    console.log('  renderWorldCopies :', renderWorldCopies, '← will set false');
    console.log(
      '  maxTileCacheSize  :',
      maxTileCacheSize,
      '(null/unavailable = unlimited)',
    );
    console.log('  tile cache entries (all sources):', tileCacheEntries);
    console.log(
      '  antialias (at init):',
      antialias,
      '← read-only, flag to game devs',
    );
    console.log('  WebGL MAX_TEXTURE_SIZE:', maxTextureSize);
    console.groupEnd();

    // --- Apply ---

    // Disable world copies — city-scoped map never needs them.
    this.previousRenderWorldCopies = renderWorldCopies;
    this.map.setRenderWorldCopies(false);
    console.log(
      `${LOG} setRenderWorldCopies(false) — was: ${renderWorldCopies}`,
    );

    // Bound the tile cache if the setter is available.
    // 50 tiles at ~0.5–2MB each ≈ 25–100MB budget; tunable once we have
    // visibility into real tile sizes. Unlimited is the primary OOM driver.
    const TILE_CACHE_LIMIT = 50;
    if (mapWithOptionalMethods.setMaxTileCacheSize) {
      mapWithOptionalMethods.setMaxTileCacheSize(TILE_CACHE_LIMIT);
      console.log(`${LOG} setMaxTileCacheSize(${TILE_CACHE_LIMIT})`);
    } else {
      console.warn(
        `${LOG} setMaxTileCacheSize unavailable in this MapLibre version — tile cache unbounded`,
      );
    }
  }

  private restoreMapRenderSettings(): void {
    if (this.previousRenderWorldCopies === null) return;
    this.map.setRenderWorldCopies(this.previousRenderWorldCopies);
    console.log(
      `${LOG} Restored renderWorldCopies: ${this.previousRenderWorldCopies}`,
    );
    this.previousRenderWorldCopies = null;
  }

  /**
   * Counts tiles across all source caches in the map's style.
   *
   * Two structures of interest per source:
   *  - `_tiles`: actively-loaded tiles (visible or recently-visible)
   *  - `_cache`: LRU cache for evicted tiles being kept warm
   *
   * Returns the sum across all sources; 0 if the internal structure is not
   * accessible. Logs a per-source breakdown for diagnostic visibility.
   */
  private getTileCacheEntries(): number {
    const mapAsAny = this.map as unknown as Record<string, unknown>;
    const style = mapAsAny['style'] as Record<string, unknown> | undefined;
    const sourceCaches =
      (style?.['sourceCaches'] as Record<string, unknown> | undefined) ??
      (style?.['_sourceCaches'] as Record<string, unknown> | undefined);

    if (!sourceCaches) return 0;

    const breakdown: Record<string, { tiles: number; cache: number }> = {};
    let total = 0;

    for (const [sourceId, sc] of Object.entries(sourceCaches)) {
      const scAny = sc as Record<string, unknown>;

      // _tiles is typically a Map<string, Tile> or plain object.
      const tilesField = scAny['_tiles'];
      let tilesCount = 0;
      if (tilesField instanceof Map) {
        tilesCount = tilesField.size;
      } else if (tilesField && typeof tilesField === 'object') {
        tilesCount = Object.keys(tilesField).length;
      }

      // _cache is an LRU cache. Try common shapes: .size, .data.size, .order.length.
      const cacheField = scAny['_cache'] as Record<string, unknown> | undefined;
      let cacheCount = 0;
      if (cacheField) {
        const cacheSize = cacheField['size'];
        const cacheData = cacheField['data'];
        const cacheOrder = cacheField['order'];
        if (typeof cacheSize === 'number') {
          cacheCount = cacheSize;
        } else if (cacheData instanceof Map) {
          cacheCount = cacheData.size;
        } else if (Array.isArray(cacheOrder)) {
          cacheCount = cacheOrder.length;
        }
      }

      breakdown[sourceId] = { tiles: tilesCount, cache: cacheCount };
      total += tilesCount + cacheCount;
    }

    // Log per-source breakdown only when it changes. Each capture would
    // otherwise emit identical breakdown lines, polluting DevTools logs.
    const summary = Object.entries(breakdown)
      .map(([id, { tiles, cache }]) => `${id}:${tiles}+${cache}`)
      .join('|');
    if (summary !== this.lastTileBreakdownSummary) {
      this.lastTileBreakdownSummary = summary;
      if (total > 0) {
        console.log(`${LOG} [tile-breakdown] ${summary} (active+evicted)`);
      }
    }

    return total;
  }

  // ---------------------------------------------------------------------------
  // Memory leak detection
  // ---------------------------------------------------------------------------

  /**
   * Captures a memory snapshot tagged with the triggering event and logs the
   * delta vs. the previous snapshot. Used to detect per-cycle memory growth
   * that points to a leak.
   *
   * Reads `performance.memory` (Chromium/Electron-specific). Note: this only
   * sees JS heap. ArrayBuffer external memory (where most tile data lives)
   * is not directly visible here, but its growth typically tracks heap growth
   * via wrapper objects and tile cache entry counts.
   */
  private captureMemory(event: string): void {
    const perfWithMemory = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
    const memory = perfWithMemory.memory;
    if (!memory) {
      console.warn(
        `${LOG} [memory] performance.memory unavailable — skipping ${event}`,
      );
      return;
    }

    const heapUsedMB = memory.usedJSHeapSize / (1024 * 1024);
    const tileCacheEntries = this.getTileCacheEntries();
    const domNodeCount = document.getElementsByTagName('*').length;
    const webglNet = this.webglTracker?.snapshot() ?? null;
    const timestamp = performance.now();

    const snapshot: MemorySnapshot = {
      event,
      timestamp,
      heapUsedMB,
      tileCacheEntries,
      domNodeCount,
      webglNet,
    };
    const prev = this.memorySnapshots[this.memorySnapshots.length - 1];
    this.memorySnapshots.push(snapshot);

    // Cap history to prevent the tracker itself from leaking memory.
    if (this.memorySnapshots.length > 200) {
      this.memorySnapshots.shift();
    }

    const idx = this.memorySnapshots.length;
    const sign = (n: number) => (n >= 0 ? '+' : '');

    // Single-line summary keeps DevTools log volume manageable. Each console
    // call has IPC overhead to the DevTools process; many lines per toggle
    // become a real bottleneck and can OOM DevTools itself.
    const webglParts = webglNet
      ? [
          `B${webglNet.Buffer.net}`,
          `T${webglNet.Texture.net}`,
          `V${webglNet.VertexArray.net}`,
        ].join(',')
      : '?';
    const perfPart = this.perfMonitor ? ` | ${this.perfMonitor.summary()}` : '';
    const totalSummary = `${heapUsedMB.toFixed(1)}MB heap / ${tileCacheEntries}t / ${domNodeCount}d / ${webglParts}${perfPart}`;
    console.log(`${LOG} [${event} #${idx}] ${totalSummary}`);

    // Detail logs only when something genuinely changed beyond expected
    // toggle churn. Thresholds are tuned to the baseline noise observed on
    // demand-view toggles (heap stable, DOM ±108, WebGL net ±~30).
    if (prev) {
      const dHeap = heapUsedMB - prev.heapUsedMB;
      const dCache = tileCacheEntries - prev.tileCacheEntries;
      const HEAP_GROWTH_THRESHOLD_MB = 5;
      const TILE_GROWTH_THRESHOLD = 5;

      if (Math.abs(dHeap) >= HEAP_GROWTH_THRESHOLD_MB) {
        console.warn(
          `${LOG} ⚠ heap moved ${sign(dHeap)}${dHeap.toFixed(1)} MB this cycle — investigate`,
        );
      }
      if (Math.abs(dCache) >= TILE_GROWTH_THRESHOLD) {
        console.warn(
          `${LOG} ⚠ tile cache moved ${sign(dCache)}${dCache} entries this cycle`,
        );
      }

      // Cycle-level (same event to same event) — flag persistent drift only.
      const prevSameEvent = this.findPreviousSameEvent(event, idx - 2);
      if (prevSameEvent) {
        const dCycleHeap = heapUsedMB - prevSameEvent.heapUsedMB;
        if (Math.abs(dCycleHeap) >= HEAP_GROWTH_THRESHOLD_MB) {
          console.warn(
            `${LOG} ⚠ heap drift vs prev '${event}': ${sign(dCycleHeap)}${dCycleHeap.toFixed(1)} MB`,
          );
        }
      }
    }

    // FPS warning — flag when the renderer is clearly struggling.
    if (this.perfMonitor) {
      const perfSnap = this.perfMonitor.snapshot();
      if (perfSnap.fps < 20 && perfSnap.fps > 0) {
        // Only log every ~10 toggles to avoid spam during sustained low FPS.
        if (idx % 10 === 1) {
          console.warn(
            `${LOG} ⚠ FPS low: ${perfSnap.fps} (p95 ${perfSnap.frameTimeP95Ms.toFixed(0)}ms, longtasks ${perfSnap.longTasksLastSecond})`,
          );
        }
      }
      if (perfSnap.glErrors.length > 0) {
        console.warn(`${LOG} ⚠ WebGL errors: ${perfSnap.glErrors.join(', ')}`);
      }
    }
  }

  private findPreviousSameEvent(
    event: string,
    fromIndex: number,
  ): MemorySnapshot | null {
    for (let i = fromIndex; i >= 0; i--) {
      const s = this.memorySnapshots[i];
      if (s && s.event === event) return s;
    }
    return null;
  }

  detach(): void {
    this.removeOurLayer();
    this.restoreImplSetProps();
    this.restoreMapMethods();
    this.restoreMapRenderSettings();
    this.stopWebGLTracker();
    this.stopPerfMonitor();

    // Best-effort: restore game layer visibility so it is in a clean state if
    // the city is reloaded without a full game restart. City teardown will
    // remove the deck.gl layer from the map anyway, but leaving impl.visible
    // as false could cause issues if the impl object is reused.
    if (this.captured?.impl) {
      try {
        this.captured.impl.setProps({ visible: true });
      } catch {
        // Impl may already be disposed — safe to ignore.
      }
    }

    this.captured = null;
    this.cachedFeatures = [];
    console.log(`${LOG} Detached`);
  }

  /**
   * Recomputes fill colors for all cached features using the current game
   * state (mapMode, isDark, etc. via the captured getFillColor closure) and
   * pushes an updated GeoJSON payload to our source.
   *
   * Call this when the user requests a color refresh, or when the mod detects
   * a theme change that warrants an update.
   */
  refreshColors(): void {
    if (this.cachedFeatures.length === 0) {
      console.warn(`${LOG} refreshColors: no feature data cached yet`);
      return;
    }
    this.updateSource(this.cachedFeatures);
    console.log(
      `${LOG} Colors refreshed for ${this.cachedFeatures.length} features`,
    );
  }

  // ---------------------------------------------------------------------------
  // Map method patching
  // ---------------------------------------------------------------------------

  private patchMapMethods(): void {
    const { map } = this;
    const self = this;

    const orig: PatchedMapMethods = {
      addLayer: map.addLayer.bind(map),
      removeLayer: map.removeLayer.bind(map),
    };
    this.patched = orig;

    (map as unknown as Record<string, unknown>).addLayer = function (
      ...args: Parameters<maplibregl.Map['addLayer']>
    ) {
      const [spec] = args;
      if (spec.id === GAME_LAYER_ID) {
        console.log(`${LOG} Intercepted game addLayer('${GAME_LAYER_ID}')`);
        const result = orig.addLayer(...args);
        // Retrieve the fully-initialized runtime object after registration.
        const registered = map.getLayer(GAME_LAYER_ID) as
          | CustomLayerMc
          | undefined;
        if (registered?.implementation) {
          self.takeoverImpl(registered.implementation);
        }
        return result;
      }
      return orig.addLayer(...args);
    };

    (map as unknown as Record<string, unknown>).removeLayer = function (
      ...args: Parameters<maplibregl.Map['removeLayer']>
    ) {
      if (args[0] === GAME_LAYER_ID) {
        console.log(
          `${LOG} Game removeLayer('${GAME_LAYER_ID}') — cleaning up impl patch`,
        );
        // Game is tearing down its layer. Release our impl reference and
        // patch so we don't hold stale references.
        self.restoreImplSetProps();
        self.captured = null;
      }
      return orig.removeLayer(...args);
    };
  }

  private restoreMapMethods(): void {
    if (!this.patched) return;
    const m = this.map as unknown as Record<string, unknown>;
    m.addLayer = this.patched.addLayer;
    m.removeLayer = this.patched.removeLayer;
    this.patched = null;
  }

  // ---------------------------------------------------------------------------
  // Takeover: hide game layer, capture accessors, install our layer
  // ---------------------------------------------------------------------------

  private takeoverImpl(impl: MapboxLayerImpl): void {
    const getFillColor = impl.props['getFillColor'] as
      | GameFillColorFn
      | undefined;
    const onClick = impl.props['onClick'] as GameClickFn | undefined;

    if (!getFillColor || !onClick) {
      console.warn(
        `${LOG} Expected props missing — getFillColor: ${!!getFillColor}, onClick: ${!!onClick}. Aborting takeover.`,
      );
      return;
    }

    this.captured = { impl, getFillColor, onClick };

    // Hide the game's deck.gl layer AND free its GPU buffers by clearing data.
    // The buffers from the initial addLayer (allocated for thousands of
    // features) are released here, before patching setProps to suppress all
    // future data updates to the hidden layer.
    impl.setProps({ visible: false, data: [] });
    console.log(`${LOG} Game layer hidden + initial data cleared`);

    // Intercept future setProps calls so we receive data updates.
    this.patchImplSetProps(impl);

    // Add our source + layer.
    this.addOurLayer();
  }

  // ---------------------------------------------------------------------------
  // impl.setProps patching (data intercept)
  // ---------------------------------------------------------------------------

  private patchImplSetProps(impl: MapboxLayerImpl): void {
    const self = this;
    this.originalSetProps = impl.setProps.bind(impl);

    impl.setProps = function (props: Record<string, unknown>) {
      // Detect demand view open/close transitions via the game's original
      // visible flag (we override to false below, but capture the intent first).
      if ('visible' in props) {
        const requestedVisible = props['visible'] === true;
        if (
          self.lastRequestedVisible !== null &&
          self.lastRequestedVisible !== requestedVisible
        ) {
          self.captureMemory(
            requestedVisible ? 'demand-view-open' : 'demand-view-close',
          );
        }
        self.lastRequestedVisible = requestedVisible;
      }

      if ('data' in props && Array.isArray(props['data'])) {
        const features = props['data'] as GeoJSON.Feature[];
        const now = performance.now();
        const elapsed =
          self.lastDataUpdateMs !== null
            ? `+${(now - self.lastDataUpdateMs).toFixed(1)}ms since last`
            : 'first update';
        self.lastDataUpdateMs = now;
        const count = ++self.dataUpdateCount;

        // Diff updateTriggers to detect meaningful game state changes.
        const triggers = props['updateTriggers'];
        const triggerStr =
          triggers !== undefined ? JSON.stringify(triggers) : '(none)';
        const triggerChanged = triggerStr !== self.lastUpdateTriggerSerialized;
        self.lastUpdateTriggerSerialized = triggerStr;

        // Only refresh the source when the game signals something meaningful
        // changed (selection, color mode, demand data). The vast majority of
        // calls are render-loop no-ops with identical triggers — skip those.
        const isFirstUpdate = count === 1;
        if (triggerChanged || isFirstUpdate) {
          const reason = isFirstUpdate ? 'initial load' : 'triggers changed';
          const stack = new Error().stack ?? '(no stack)';
          const callerFrames = stack
            .split('\n')
            .slice(2, 5)
            .map((l) => l.trim())
            .join('\n    ');
          console.group(
            `${LOG} Source refresh #${count} — ${reason} (${features.length} features, ${elapsed})`,
          );
          console.log('  updateTriggers:', triggers);
          console.log('  caller:\n   ', callerFrames);
          console.groupEnd();
          self.updateSource(features);
        }
      }

      // DO NOT forward to deck.gl. The MapboxOverlay's setProps re-runs
      // resolveLayers on every call, iterating all deck.gl layers — this
      // dominates the frame budget during rapid setProps cascades and is the
      // root cause of the FPS collapse we observed (60→3 fps, p95 frame time
      // 78ms→700ms during rapid demand-view toggling).
      //
      // The layer was put into a stable state in takeoverImpl:
      //   { visible: false, data: [] }
      // and stays that way as long as we don't forward. The game's React
      // continues calling setProps on every render — those calls are now
      // no-ops past our patch, so resolveLayers never fires.
      //
      // We still extract data above for our own MapLibre layer's source, and
      // capture visibility transitions for memory diagnostics.
    };
  }

  private restoreImplSetProps(): void {
    if (!this.captured?.impl || !this.originalSetProps) return;
    this.captured.impl.setProps = this.originalSetProps;
    this.originalSetProps = null;
  }

  // ---------------------------------------------------------------------------
  // Our layer management
  // ---------------------------------------------------------------------------

  private addOurLayer(): void {
    if (this.map.getSource(EDV_SOURCE_ID)) {
      console.warn(
        `${LOG} Source '${EDV_SOURCE_ID}' already exists — skipping`,
      );
      return;
    }

    this.map.addSource(EDV_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Use the internal patched addLayer — it falls through to orig for any id
    // other than GAME_LAYER_ID, so our EDV layer is added natively.
    this.map.addLayer({
      id: EDV_LAYER_ID,
      type: 'circle',
      source: EDV_SOURCE_ID,
      paint: {
        'circle-radius': this.radiusPx,
        // fillColor is a pre-computed CSS rgba string baked into each feature.
        'circle-color': ['get', 'fillColor'] as unknown as string,
        'circle-stroke-width': 1,
        'circle-stroke-color': ['get', 'strokeColor'] as unknown as string,
        // Render circles in screen space rather than map space. This eliminates
        // per-frame reprojection on pan/rotation — a meaningful GPU cost at
        // 3,000+ points. Trade-off: circles don't tilt with the map on pitch.
        // TODO: expose as a mod setting if visual difference is jarring.
        'circle-pitch-alignment': 'viewport',
      },
    });

    // Replicate the game's click handler using the captured onClick reference.
    this.clickHandler = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature?.properties || !this.captured) return;

      // Debug: log full feature properties to understand available data
      // for radius/size decisions and game interaction behaviour.
      console.group(`${LOG} Click — feature properties`);
      console.log(feature.properties);
      console.groupEnd();

      this.captured.onClick({
        object: { properties: { id: String(feature.properties['id'] ?? '') } },
      });
    };
    this.map.on('click', EDV_LAYER_ID, this.clickHandler);

    console.log(
      `${LOG} EDV circle layer added (id: '${EDV_LAYER_ID}', radius: ${this.radiusPx}px)`,
    );
  }

  private removeOurLayer(): void {
    if (this.clickHandler) {
      this.map.off('click', EDV_LAYER_ID, this.clickHandler);
      this.clickHandler = null;
    }

    try {
      if (this.map.getLayer(EDV_LAYER_ID)) {
        this.map.removeLayer(EDV_LAYER_ID);
      }
    } catch (e) {
      console.warn(`${LOG} Error removing EDV layer:`, e);
    }

    try {
      if (this.map.getSource(EDV_SOURCE_ID)) {
        this.map.removeSource(EDV_SOURCE_ID);
      }
    } catch (e) {
      console.warn(`${LOG} Error removing EDV source:`, e);
    }
  }

  // ---------------------------------------------------------------------------
  // Source update: color baking
  // ---------------------------------------------------------------------------

  private updateSource(features: GeoJSON.Feature[]): void {
    if (!this.captured) return;

    this.cachedFeatures = features;

    const { getFillColor } = this.captured;
    const coloredFeatures: GeoJSON.Feature[] = features.map((f) => {
      // Call the game's own accessor — it reads mapMode and isDark from its
      // closure, so the result always reflects current game state.
      let fillColor = 'rgba(128,128,128,1)'; // fallback grey
      try {
        const [r, g, b, a] = getFillColor(f);
        fillColor = `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
      } catch {
        // Accessor threw (e.g. feature missing expected properties). Use fallback.
      }

      // Stroke: game uses black at per-feature opacity.
      const opacity = (f.properties?.['opacity'] as number | undefined) ?? 1;
      const strokeColor = `rgba(0,0,0,${opacity.toFixed(3)})`;

      return {
        ...f,
        properties: {
          ...f.properties,
          fillColor,
          strokeColor,
        },
      };
    });

    const source = this.map.getSource(EDV_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    source?.setData({
      type: 'FeatureCollection',
      features: coloredFeatures,
    });
  }
}
