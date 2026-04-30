/**
 * Replaces the game's `demand-points` deck.gl layer with a native MapLibre
 * circle layer that we fully control.
 *
 * ## Why
 * The game's demand layer is a deck.gl GeoJsonLayer wrapped in a MapboxLayer
 * adapter. Every mouse movement triggers a React re-render → setProps call on
 * the deck.gl layer, even when the layer is hidden. By replacing it with a
 * native MapLibre circle layer:
 *
 *   - MapLibre skips the layer entirely when hidden — no rendering, no event
 *     callbacks, no deck.gl overhead.
 *   - We control when colours are recomputed (only on meaningful trigger
 *     changes) rather than per-frame.
 *   - We control dot radius independently of the game's per-feature size.
 *
 * ## Coloring
 * Colours are baked into the GeoJSON feature properties at source-update time
 * by calling the game's own `getFillColor` accessor directly. The accessor is
 * a closure over `mapMode` and `isDark`, so calling it at any time reflects
 * current game state — no replication of the game's colour logic needed.
 *
 * ## Layer structure (confirmed at runtime)
 * map.getLayer('demand-points')
 *   → maplibre CustomLayer wrapper
 *       .implementation → MapboxLayer (deck.gl ↔ MapLibre adapter)
 *           .props      → { getPointRadius, getFillColor, getLineColor,
 *                           getLineWidth, onClick, visible, updateTriggers, … }
 *           .setProps() → rebuilds the internal GeoJsonLayer
 *
 * ## Lifecycle
 * - attach()         Call once per map instance on city activation.
 * - detach()         Call on city deactivation / game end.
 * - refreshColors()  Call to recompute fill colours using current game state.
 */

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
  // Retained so refreshColors() can recompute without waiting for the next
  // update.
  private cachedFeatures: GeoJSON.Feature[] = [];

  // Serialised updateTriggers from the most recent forwarded setProps call.
  // The game calls setProps continuously with identical triggers; we only
  // refresh our source when triggers actually change.
  private lastUpdateTriggerSerialized: string | null = null;
  private dataUpdateCount = 0;

  // Render optimisation: stored pre-attach value for clean restore on detach.
  private previousRenderWorldCopies: boolean | null = null;

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
    this.applyMapRenderSettings();

    // If the game already added the layer before we attached (hot-reload or
    // map-ready fires after city-load), take it over immediately.
    const existing = this.map.getLayer(GAME_LAYER_ID) as
      | CustomLayerMc
      | undefined;
    if (existing?.implementation) {
      this.takeoverImpl(existing.implementation);
    }
  }

  detach(): void {
    this.removeOurLayer();
    this.restoreImplSetProps();
    this.restoreMapMethods();
    this.restoreMapRenderSettings();

    // Best-effort: restore game layer visibility in case the impl is reused.
    if (this.captured?.impl) {
      try {
        this.captured.impl.setProps({ visible: true });
      } catch {
        // Impl may already be disposed — safe to ignore.
      }
    }

    this.captured = null;
    this.cachedFeatures = [];
  }

  /**
   * Recomputes fill colours for all cached features using the current game
   * state (mapMode, isDark, etc. via the captured getFillColor closure) and
   * pushes an updated GeoJSON payload to our source. Call when the user
   * requests a colour refresh or when the mod detects a theme change.
   */
  refreshColors(): void {
    if (this.cachedFeatures.length === 0) return;
    this.updateSource(this.cachedFeatures);
  }

  // ---------------------------------------------------------------------------
  // Map render settings
  // ---------------------------------------------------------------------------

  /**
   * Disables world-copy rendering for the city-scoped map. Saves the previous
   * value for restoration on detach.
   */
  private applyMapRenderSettings(): void {
    this.previousRenderWorldCopies = this.map.getRenderWorldCopies();
    this.map.setRenderWorldCopies(false);
  }

  private restoreMapRenderSettings(): void {
    if (this.previousRenderWorldCopies === null) return;
    this.map.setRenderWorldCopies(this.previousRenderWorldCopies);
    this.previousRenderWorldCopies = null;
  }

  // ---------------------------------------------------------------------------
  // Map method patching: intercept addLayer/removeLayer for `demand-points`
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
        const result = orig.addLayer(...args);
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

    // Hide the game's deck.gl layer AND free its GPU buffers by clearing
    // data. The buffers from the initial addLayer (allocated for thousands of
    // features) are released here, before patching setProps to suppress all
    // future data updates to the hidden layer.
    impl.setProps({ visible: false, data: [] });

    // Intercept future setProps calls so we receive data updates.
    this.patchImplSetProps(impl);

    // Add our source + layer.
    this.addOurLayer();
  }

  // ---------------------------------------------------------------------------
  // impl.setProps patching
  //
  // The patched setProps does NOT forward to the original. The MapboxOverlay's
  // setProps re-runs resolveLayers on every call, which dominates the frame
  // budget during rapid demand-view toggles. The deck.gl layer was put into a
  // stable terminal state in takeoverImpl ({ visible: false, data: [] }) and
  // stays there permanently. The game's React continues calling setProps on
  // every render — those calls are now no-ops past our patch.
  //
  // We still extract data here for our own MapLibre layer's source, gated on
  // updateTriggers so we only refresh when the game signals a meaningful
  // change (selection, colour mode, demand data update).
  // ---------------------------------------------------------------------------

  private patchImplSetProps(impl: MapboxLayerImpl): void {
    const self = this;
    this.originalSetProps = impl.setProps.bind(impl);

    impl.setProps = function (props: Record<string, unknown>) {
      if (!('data' in props) || !Array.isArray(props['data'])) return;

      const features = props['data'] as GeoJSON.Feature[];
      const triggers = props['updateTriggers'];
      const triggerStr =
        triggers !== undefined ? JSON.stringify(triggers) : '(none)';
      const triggerChanged = triggerStr !== self.lastUpdateTriggerSerialized;
      self.lastUpdateTriggerSerialized = triggerStr;
      const isFirstUpdate = ++self.dataUpdateCount === 1;

      if (triggerChanged || isFirstUpdate) {
        self.updateSource(features);
      }
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
    if (this.map.getSource(EDV_SOURCE_ID)) return;

    this.map.addSource(EDV_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

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
        // Render circles in screen space rather than map space to eliminate
        // per-frame reprojection on pan/rotation.
        'circle-pitch-alignment': 'viewport',
      },
    });

    // Replicate the game's click handler using the captured onClick reference.
    this.clickHandler = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (feature?.properties && this.captured) {
        this.captured.onClick({
          object: {
            properties: { id: String(feature.properties['id'] ?? '') },
          },
        });
      }
    };
    this.map.on('click', EDV_LAYER_ID, this.clickHandler);
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
    } catch {
      // map may already be torn down
    }

    try {
      if (this.map.getSource(EDV_SOURCE_ID)) {
        this.map.removeSource(EDV_SOURCE_ID);
      }
    } catch {
      // source may already be removed
    }
  }

  // ---------------------------------------------------------------------------
  // Source update: colour baking
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
        // Accessor threw (e.g. feature missing expected properties).
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
