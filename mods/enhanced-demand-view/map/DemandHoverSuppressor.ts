/**
 * Option B: Suppresses the deck.gl hover handlers that drive high-frequency
 * `setProps` calls on every mouse movement over the map.
 *
 * ## Problem
 * Every mouse movement triggers:
 *   map mousemove/mouseover/mouseout
 *     → deck.gl _updateHover()
 *       → game React re-render
 *         → impl.setProps({ updateTriggers: { ...all accessors: [newHoverId] } })
 *
 * Signature (confirmed at runtime, shared by all three events):
 *   (e) => { if (e.type === "mousemove" || e.type === "mouseout") this._updateHover(e); ...
 *
 * ## Render/move handlers — what is and isn't suppressed
 * afterRender (render) and onMapMove (move) are registered by the deck.gl
 * MapboxOverlay adapter as global infrastructure shared by all deck.gl layers.
 * Removing them breaks other game layers, so they are left untouched.
 * DemandLayerManager's trigger gate already makes their setProps pass-through
 * cost negligible. setCameraCenter (move) is suppressed as it is a standalone
 * camera-sync helper with no impact on other layers.
 *
 * ## Use as MVP (standalone, without DemandLayerManager / Option C)
 * The game's deck.gl layer still renders, but the hover cascade is eliminated.
 * Hover highlighting on demand dots is lost; everything else works normally.
 *
 * ## Use alongside DemandLayerManager (Option C)
 * The manager already hides the game layer (visible: false) and gates source
 * updates. The suppressor removes the hover cascade at its source, eliminating
 * even the JS overhead of the React re-render → setProps path on mouse movement.
 *
 * ## Risk
 * Relies on map._listeners (MapLibre internal). Logs a warning and no-ops
 * gracefully if the structure changes between game updates.
 */

const LOG = '[EnhancedDemandView][DemandHoverSuppressor]';

// ---------------------------------------------------------------------------
// Handler signature matchers (confirmed at runtime)
// ---------------------------------------------------------------------------

const HOVER_EVENTS = ['mousemove', 'mouseover', 'mouseout'] as const;
const RENDER_EVENTS = ['move'] as const;

type HoverEvent = (typeof HOVER_EVENTS)[number];
type RenderEvent = (typeof RENDER_EVENTS)[number];
type SuppressedEvent = HoverEvent | RenderEvent;

// Deck.gl render-cycle handler signatures. Each entry is an AND-match:
// every fragment must appear in the handler's string representation.
// Note: afterRender (render) and onMapMove (move) are intentionally excluded —
// they are global MapboxOverlay infrastructure shared by all deck.gl layers and
// cannot be removed without breaking other game layers. The trigger gate in
// DemandLayerManager already makes their setProps pass-through cost negligible.
const RENDER_CYCLE_SIGNATURES: Array<{
  event: RenderEvent;
  fragments: string[];
  label: string;
}> = [
  {
    event: 'move',
    fragments: ['setCameraCenter'],
    label: 'setCameraCenter (pan/rotation camera sync)',
  },
];

type DetachedHandler = {
  event: SuppressedEvent;
  fn: (e: unknown) => void;
  label: string;
};

export class DemandHoverSuppressor {
  private detached: DetachedHandler[] = [];

  constructor(private readonly map: maplibregl.Map) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Detaches all hover and render-cycle deck.gl handlers from the map.
   * Safe to call multiple times — subsequent calls are no-ops if already
   * suppressed.
   */
  suppress(): void {
    if (this.detached.length > 0) {
      console.warn(`${LOG} Already suppressed — skipping`);
      return;
    }

    const listeners = this.resolveListeners();
    if (!listeners) return;

    this.suppressHoverHandlers(listeners);
    this.suppressRenderCycleHandlers(listeners);

    if (this.detached.length === 0) {
      console.warn(`${LOG} No target handlers found — listener structure may have changed`);
    } else {
      const summary = this.detached.map((d) => `'${d.event}': ${d.label}`).join(', ');
      console.log(`${LOG} Suppressed ${this.detached.length} handler(s): ${summary}`);
    }
  }

  /**
   * Re-attaches all previously detached handlers, fully restoring game
   * behaviour. Safe to call even if suppress() was never called or failed.
   */
  restore(): void {
    if (this.detached.length === 0) return;

    for (const { event, fn, label } of this.detached) {
      try {
        this.map.on(event, fn);
        console.log(`${LOG} Restored '${event}' handler: ${label}`);
      } catch (e) {
        console.warn(`${LOG} Failed to restore '${event}' handler (${label}):`, e);
      }
    }

    this.detached = [];
    console.log(`${LOG} Restored — game hover and render-cycle behaviour resumed`);
  }

  // ---------------------------------------------------------------------------
  // Suppression helpers
  // ---------------------------------------------------------------------------

  private suppressHoverHandlers(listeners: Record<string, unknown[]>): void {
    for (const event of HOVER_EVENTS) {
      const handlers = (listeners[event] ?? []) as Array<(e: unknown) => void>;
      for (const fn of handlers) {
        if (this.matchesFragments(fn, ['_updateHover'])) {
          this.detachHandler(event, fn, '_updateHover (hover cascade)');
        }
      }
    }
  }

  private suppressRenderCycleHandlers(listeners: Record<string, unknown[]>): void {
    for (const { event, fragments, label } of RENDER_CYCLE_SIGNATURES) {
      const handlers = (listeners[event] ?? []) as Array<(e: unknown) => void>;
      for (const fn of handlers) {
        // Avoid double-detaching the same reference if it matches multiple entries.
        if (
          this.matchesFragments(fn, fragments) &&
          !this.detached.some((d) => d.fn === fn)
        ) {
          this.detachHandler(event, fn, label);
        }
      }
    }
  }

  private detachHandler(
    event: SuppressedEvent,
    fn: (e: unknown) => void,
    label: string,
  ): void {
    try {
      this.map.off(event, fn);
      this.detached.push({ event, fn, label });
      console.log(`${LOG} Removed '${event}' handler: ${label}`);
    } catch (e) {
      console.warn(`${LOG} Failed to remove '${event}' handler (${label}):`, e);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private resolveListeners(): Record<string, unknown[]> | null {
    const mapAsAny = this.map as unknown as Record<string, unknown>;
    const raw = mapAsAny['_listeners'];

    if (!raw || typeof raw !== 'object') {
      console.warn(
        `${LOG} map._listeners not accessible — suppression unavailable.`,
        'Available internal keys:',
        Object.keys(mapAsAny).filter((k) => k.startsWith('_')),
      );
      return null;
    }

    return raw as Record<string, unknown[]>;
  }

  /** Returns true if every fragment appears in the handler's source string. */
  private matchesFragments(fn: unknown, fragments: string[]): boolean {
    if (typeof fn !== 'function') return false;
    try {
      const src = fn.toString();
      return fragments.every((f) => src.includes(f));
    } catch {
      return false;
    }
  }
}
