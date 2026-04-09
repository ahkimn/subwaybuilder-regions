/**
 * Observes and instruments the game's `demand-points` MapLibre custom layer.
 *
 * ## Layer Structure (confirmed at runtime)
 *
 * map.getLayer('demand-points')
 *   → Mc (maplibre internal CustomLayer wrapper)
 *       .type              = 'custom'
 *       .implementation    → MapboxLayer (deck.gl ↔ MapLibre adapter)
 *           .props         = { id, deck, getPointRadius, getFillColor, getLineColor,
 *                              getLineWidth, lineWidthUnits, filled, stroked, pickable,
 *                              opacity, visible, updateTriggers, onClick }
 *           .deck          → Deck (deck.gl renderer instance)
 *           .setProps(...)   delegates to deck.setProps, which rebuilds the GeoJsonLayer
 *
 * Inside deck.gl (accessed via Symbols, not directly patchable):
 *   Symbol(component)      → GeoJsonLayer
 *   Symbol(asyncPropResolved).data → [{properties: {size, opacity, selected, ...}}, ...]
 *
 * ## Key accessors on each feature
 *   getPointRadius : (d) => d.properties.size   ← shape; what we want to override
 *   getFillColor   : (d) => ...                  ← color; not our concern
 *   getLineColor   : (d) => [0,0,0, d.properties.opacity*255]
 *   getLineWidth   : (d) => d.properties.selected ? 20 : 4
 *
 * ## Modification strategy (one-time, on activation)
 *   implementation.setProps({
 *     getPointRadius: FIXED_RADIUS,
 *     updateTriggers: { getPointRadius: ['edv-override'] },
 *   })
 *   Since geometry is static through the game loop, this only needs to run once.
 *
 * ## What this observer does
 *   - Intercepts map.addLayer to capture the layer on creation
 *   - Patches MapboxLayer.setProps to log every prop update from the game
 *   - Categorises each update: shape-relevant vs color-only
 *   - Logs the initial confirmed props on capture (hot-reload path)
 *   - Restores all patches on detach()
 */

const DEMAND_LAYER_ID = 'demand-points';
const LOG = '[EnhancedDemandView][DemandLayerObserver]';

/**
 * The deck.gl MapboxLayer adapter as observed at runtime.
 * Only the members we interact with are typed here.
 */
type MapboxLayerImpl = {
  props: Record<string, unknown>;
  deck: unknown;
  setProps(props: Record<string, unknown>): void;
};

/** The maplibre CustomLayer wrapper (Mc) that getLayer() returns. */
type CustomLayerMc = {
  id: string;
  type: 'custom';
  implementation?: MapboxLayerImpl;
};

type OriginalMapMethods = {
  addLayer: maplibregl.Map['addLayer'];
  removeLayer: maplibregl.Map['removeLayer'];
};

export class DemandLayerObserver {
  private originals: OriginalMapMethods | null = null;
  private capturedImpl: MapboxLayerImpl | null = null;
  private originalSetProps: ((props: Record<string, unknown>) => void) | null = null;
  private setPropsCalls = 0;

  constructor(private readonly map: maplibregl.Map) {}

  // ---------------------------------------------------------------------------
  // Map listener probe
  // ---------------------------------------------------------------------------

  /**
   * Dumps maplibre's internal event listener registry for events relevant to
   * demand layer updates: mousemove, render, data, move.
   *
   * Helps determine the source of high-frequency setProps calls and whether
   * throttling/replacing the underlying listeners is feasible (Option B/C).
   *
   * Results are logged with handler count and — where the function source is
   * readable — the handler's string representation for identification.
   */
  private probeMapListeners(): void {
    const mapAsAny = this.map as unknown as Record<string, unknown>;

    // MapLibre v5 Evented stores listeners in _listeners.
    // Fall back to logging available underscore-prefixed keys if not found.
    const listenersRaw = mapAsAny['_listeners'];
    if (!listenersRaw || typeof listenersRaw !== 'object') {
      console.warn(
        `${LOG} [probe] map._listeners not found. Available internal keys:`,
        Object.keys(mapAsAny).filter((k) => k.startsWith('_')),
      );
      return;
    }

    const listeners = listenersRaw as Record<string, unknown[]>;
    const PROBED_EVENTS = ['mousemove', 'mouseover', 'mouseout', 'render', 'data', 'move'];

    console.group(`${LOG} [probe] map._listeners`);
    for (const event of PROBED_EVENTS) {
      const handlers = listeners[event];
      if (!handlers || handlers.length === 0) {
        console.log(`  ${event}: (none)`);
        continue;
      }
      console.group(`  ${event}: ${handlers.length} handler(s)`);
      handlers.forEach((h, i) => {
        // Attempt to stringify the handler for identification; minified game
        // code will be opaque but will reveal approximate source location.
        const src = typeof h === 'function' ? h.toString().slice(0, 120) : String(h);
        console.log(`    [${i}]:`, src);
      });
      console.groupEnd();
    }
    console.groupEnd();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  attach(): void {
    this.patchMapMethods();
    this.probeMapListeners();

    // If the layer already exists at attach time (hot-reload or map rebind
    // after the game already added the layer), capture it immediately.
    const existing = this.map.getLayer(DEMAND_LAYER_ID) as CustomLayerMc | undefined;
    if (existing) {
      console.log(`${LOG} Layer already present on attach — capturing`);
      this.captureImpl(existing.implementation);
    } else {
      console.log(`${LOG} Attached — waiting for demand-points layer creation`);
    }
  }

  detach(): void {
    this.restoreImplSetProps();
    this.restoreMapMethods();
    this.capturedImpl = null;
    console.log(`${LOG} Detached`);
  }

  // ---------------------------------------------------------------------------
  // Map method patching
  // ---------------------------------------------------------------------------

  private patchMapMethods(): void {
    const { map } = this;
    const self = this;

    const orig: OriginalMapMethods = {
      addLayer: map.addLayer.bind(map),
      removeLayer: map.removeLayer.bind(map),
    };
    this.originals = orig;

    // -- addLayer --
    (map as unknown as Record<string, unknown>).addLayer = function (
      ...args: Parameters<maplibregl.Map['addLayer']>
    ) {
      const [layerSpec] = args;
      if (layerSpec.id === DEMAND_LAYER_ID) {
        const specAsAny = layerSpec as unknown as Record<string, unknown>;
        const impl = specAsAny['implementation'] as MapboxLayerImpl | undefined;

        console.log(
          `${LOG} addLayer — type: "${(layerSpec as { type?: string }).type ?? 'unknown'}"`,
        );
        if (impl?.props) {
          self.logInitialProps(impl.props, 'addLayer spec');
        }

        const result = orig.addLayer(...args);

        // Capture via getLayer() for the fully-initialized runtime object.
        const registered = map.getLayer(DEMAND_LAYER_ID) as CustomLayerMc | undefined;
        if (registered) {
          self.captureImpl(registered.implementation);
        }

        return result;
      }
      return orig.addLayer(...args);
    };

    // -- removeLayer --
    (map as unknown as Record<string, unknown>).removeLayer = function (
      ...args: Parameters<maplibregl.Map['removeLayer']>
    ) {
      const [layerId] = args;
      if (layerId === DEMAND_LAYER_ID) {
        console.log(`${LOG} removeLayer`);
        self.restoreImplSetProps();
        self.capturedImpl = null;
      }
      return orig.removeLayer(...args);
    };
  }

  private restoreMapMethods(): void {
    if (!this.originals) return;
    const m = this.map as unknown as Record<string, unknown>;
    m.addLayer = this.originals.addLayer;
    m.removeLayer = this.originals.removeLayer;
    this.originals = null;
  }

  // ---------------------------------------------------------------------------
  // MapboxLayer.setProps instrumentation
  // ---------------------------------------------------------------------------

  private captureImpl(impl: MapboxLayerImpl | undefined): void {
    if (!impl) {
      console.warn(`${LOG} No implementation found on layer — cannot intercept setProps`);
      return;
    }

    if (typeof impl.setProps !== 'function') {
      console.warn(`${LOG} implementation.setProps is not a function — cannot intercept`);
      return;
    }

    this.capturedImpl = impl;
    this.logInitialProps(impl.props, 'runtime capture');

    const self = this;
    this.originalSetProps = impl.setProps.bind(impl);

    impl.setProps = function (props: Record<string, unknown>) {
      self.logSetProps(props);
      self.originalSetProps!(props);
    };

    console.log(`${LOG} implementation.setProps intercepted`);
  }

  private restoreImplSetProps(): void {
    if (!this.capturedImpl || !this.originalSetProps) return;
    this.capturedImpl.setProps = this.originalSetProps;
    this.originalSetProps = null;
  }

  // ---------------------------------------------------------------------------
  // Logging helpers
  // ---------------------------------------------------------------------------

  private logInitialProps(
    props: Record<string, unknown>,
    source: string,
  ): void {
    const propKeys = Object.keys(props);
    console.log(`${LOG} [${source}] deck.gl prop keys:`, propKeys);
    console.log(`${LOG} [${source}] getPointRadius:`, props['getPointRadius']);
    console.log(`${LOG} [${source}] getFillColor:`, props['getFillColor']);
    console.log(`${LOG} [${source}] getLineColor:`, props['getLineColor']);
    console.log(`${LOG} [${source}] getLineWidth:`, props['getLineWidth']);
    console.log(`${LOG} [${source}] updateTriggers:`, props['updateTriggers']);
  }

  private logSetProps(props: Record<string, unknown>): void {
    const callNum = ++this.setPropsCalls;
    const keys = Object.keys(props);
    // Separate shape-relevant keys from color-only keys for readability.
    const colorKeys = new Set(['getFillColor', 'getLineColor']);
    const shapeKeys = keys.filter((k) => !colorKeys.has(k));
    const colorOnlyKeys = keys.filter((k) => colorKeys.has(k));

    if (shapeKeys.length > 0) {
      console.log(`${LOG} setProps #${callNum} — shape-relevant keys:`, shapeKeys);
      if ('getPointRadius' in props) {
        console.log(`${LOG}   getPointRadius:`, props['getPointRadius']);
      }
      if ('updateTriggers' in props) {
        console.log(`${LOG}   updateTriggers:`, props['updateTriggers']);
      }
    }

    if (colorOnlyKeys.length > 0 && shapeKeys.length === 0) {
      console.log(
        `${LOG} setProps #${callNum} — color-only update [${colorOnlyKeys.join(', ')}] (not a concern)`,
      );
    }
  }
}
