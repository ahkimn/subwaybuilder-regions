/**
 * Diagnostic: detects listener pollution on the MapLibre map instance.
 *
 * Patches map.on() and map.off() to log when handlers matching specific
 * signatures (hover, render-loop, etc.) are added or removed — with a stack
 * trace identifying the caller. Also periodically dumps the count of
 * suspicious handlers in `map._listeners` so we can see if duplicates
 * accumulate over time (e.g. on demand view open/close cycles).
 *
 * ## Why
 * If a game React component re-registers map listeners on every mount without
 * cleaning up on unmount, listener counts grow unboundedly. Each opened panel
 * adds another copy of the same handler. The setProps cascade then runs N
 * times per mouse movement instead of once.
 *
 * ## Usage
 *   const watcher = new MapListenerWatcher(map);
 *   watcher.start();
 *   // ... interact with the game ...
 *   watcher.stop();
 *
 * Logs are emitted in three cases:
 * - Handler matching a tracked signature is added via map.on
 * - Handler matching a tracked signature is removed via map.off
 * - Periodic snapshot (every PROBE_INTERVAL_MS) showing per-event handler counts
 */

const LOG = '[EnhancedDemandView][MapListenerWatcher]';
const PROBE_INTERVAL_MS = 10_000;

// Events to monitor and the signature fragments that identify the deck.gl /
// game-specific handlers we want to track for duplicates.
const TRACKED_SIGNATURES: Array<{
  event: string;
  fragments: string[];
  label: string;
}> = [
  { event: 'mousemove', fragments: ['_updateHover'], label: 'hover' },
  { event: 'mouseover', fragments: ['_updateHover'], label: 'hover' },
  { event: 'mouseout', fragments: ['_updateHover'], label: 'hover' },
  {
    event: 'render',
    fragments: ['afterRender', 'deckInstance'],
    label: 'afterRender',
  },
  {
    event: 'move',
    fragments: ['onMapMove', 'deck.isInitialized'],
    label: 'onMapMove',
  },
  { event: 'move', fragments: ['setCameraCenter'], label: 'setCameraCenter' },
];

const TRACKED_EVENTS = Array.from(
  new Set(TRACKED_SIGNATURES.map((s) => s.event)),
);

type OriginalMethods = {
  on: maplibregl.Map['on'];
  off: maplibregl.Map['off'];
};

export class MapListenerWatcher {
  private originals: OriginalMethods | null = null;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private snapshotCount = 0;

  constructor(private readonly map: maplibregl.Map) {}

  start(): void {
    if (this.originals) {
      console.warn(`${LOG} Already started — skipping`);
      return;
    }

    this.takeSnapshot('initial');
    this.patchOnOff();
    this.intervalHandle = setInterval(() => {
      this.takeSnapshot(`periodic #${++this.snapshotCount}`);
    }, PROBE_INTERVAL_MS);
    console.log(
      `${LOG} Watching ${TRACKED_EVENTS.length} event types for handler pollution`,
    );
  }

  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.restoreOnOff();
    console.log(`${LOG} Stopped`);
  }

  // ---------------------------------------------------------------------------
  // map.on / map.off patching
  // ---------------------------------------------------------------------------

  private patchOnOff(): void {
    const { map } = this;
    const self = this;

    const orig: OriginalMethods = {
      on: map.on.bind(map) as maplibregl.Map['on'],
      off: map.off.bind(map) as maplibregl.Map['off'],
    };
    this.originals = orig;

    (map as unknown as Record<string, unknown>).on = function (
      ...args: unknown[]
    ) {
      self.maybeLogRegistration('on', args);
      return (orig.on as unknown as (...a: unknown[]) => unknown)(...args);
    };

    (map as unknown as Record<string, unknown>).off = function (
      ...args: unknown[]
    ) {
      self.maybeLogRegistration('off', args);
      return (orig.off as unknown as (...a: unknown[]) => unknown)(...args);
    };
  }

  private restoreOnOff(): void {
    if (!this.originals) return;
    const m = this.map as unknown as Record<string, unknown>;
    m.on = this.originals.on;
    m.off = this.originals.off;
    this.originals = null;
  }

  /**
   * Inspects the args to map.on / map.off — when an event is one we track
   * and the handler matches a tracked signature, log it with the caller stack.
   *
   * map.on/off accept either (type, fn) or (type, layerId, fn). We need to
   * locate the function arg in either form.
   */
  private maybeLogRegistration(action: 'on' | 'off', args: unknown[]): void {
    const event = args[0];
    if (typeof event !== 'string' || !TRACKED_EVENTS.includes(event)) return;

    // Function is either args[1] (event-only) or args[2] (event + layerId).
    const fn =
      typeof args[1] === 'function'
        ? args[1]
        : typeof args[2] === 'function'
          ? args[2]
          : null;
    if (typeof fn !== 'function') return;

    const matched = TRACKED_SIGNATURES.find(
      (s) => s.event === event && this.matchesFragments(fn, s.fragments),
    );
    if (!matched) return;

    const stack = new Error().stack ?? '(no stack)';
    const callerFrames = stack
      .split('\n')
      .slice(2, 5)
      .map((l) => l.trim())
      .join('\n    ');

    console.group(
      `${LOG} map.${action}('${event}') — ${matched.label} handler ${action === 'on' ? 'ADDED' : 'REMOVED'}`,
    );
    console.log('  caller:\n   ', callerFrames);
    console.groupEnd();
  }

  // ---------------------------------------------------------------------------
  // Snapshot: count tracked handlers in map._listeners
  // ---------------------------------------------------------------------------

  private takeSnapshot(label: string): void {
    const mapAsAny = this.map as unknown as Record<string, unknown>;
    const listeners = mapAsAny['_listeners'] as
      | Record<string, unknown[]>
      | undefined;
    if (!listeners) {
      console.warn(`${LOG} [${label}] map._listeners not accessible`);
      return;
    }

    type EventStats = {
      total: number;
      tracked: Record<string, number>;
      // Untracked handlers grouped by their normalised source-signature prefix.
      untrackedBySig: Map<string, number>;
    };
    const counts: Record<string, EventStats> = {};

    for (const event of TRACKED_EVENTS) {
      const handlers = (listeners[event] ?? []) as Array<(e: unknown) => void>;
      const tracked: Record<string, number> = {};
      const untrackedBySig = new Map<string, number>();

      for (const fn of handlers) {
        let matchedSig = false;
        for (const sig of TRACKED_SIGNATURES) {
          if (sig.event !== event) continue;
          if (this.matchesFragments(fn, sig.fragments)) {
            tracked[sig.label] = (tracked[sig.label] ?? 0) + 1;
            matchedSig = true;
            break;
          }
        }
        if (!matchedSig) {
          const sigKey = this.normalisedSignature(fn);
          untrackedBySig.set(sigKey, (untrackedBySig.get(sigKey) ?? 0) + 1);
        }
      }

      counts[event] = { total: handlers.length, tracked, untrackedBySig };
    }

    console.group(`${LOG} [${label}] handler counts`);
    for (const [event, { total, tracked, untrackedBySig }] of Object.entries(
      counts,
    )) {
      const trackedSummary = Object.entries(tracked)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      console.log(
        `  ${event}: ${total} total${trackedSummary ? ` | tracked: ${trackedSummary}` : ''}`,
      );
      // Show untracked handlers grouped by signature, sorted by count descending.
      // High counts indicate listener pollution from a single registration site
      // that fires repeatedly without cleanup.
      const untrackedEntries = Array.from(untrackedBySig.entries()).sort(
        (a, b) => b[1] - a[1],
      );
      for (const [sig, count] of untrackedEntries) {
        const marker = count > 1 ? `× ${count}` : '×1';
        console.log(`    untracked ${marker}: ${sig}`);
      }
    }
    console.groupEnd();
  }

  /**
   * Returns a compact, normalised representation of a handler's source for
   * grouping purposes. Whitespace is collapsed and the source is truncated to
   * keep log output readable. Two handlers with identical normalised sources
   * almost certainly come from the same registration site.
   */
  private normalisedSignature(fn: unknown): string {
    if (typeof fn !== 'function') return '(non-function)';
    try {
      return fn.toString().replace(/\s+/g, ' ').trim().slice(0, 100);
    } catch {
      return '(unstringifiable)';
    }
  }

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
