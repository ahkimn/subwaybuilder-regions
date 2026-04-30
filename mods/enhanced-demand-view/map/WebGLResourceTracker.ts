/**
 * Tracks net WebGL resource counts (buffers, textures, framebuffers, programs,
 * etc.) on a given gl context by patching the relevant create/delete methods.
 *
 * ## Why
 * `performance.memory` only reports JS heap. WebGL resources live in GPU
 * memory and are invisible to it. When a leak shows up as renderer OOM /
 * DevTools crash without any JS heap growth, GPU resource accumulation is
 * the prime suspect.
 *
 * ## Usage
 *   const tracker = new WebGLResourceTracker(map.getCanvas().getContext('webgl2'));
 *   tracker.start();
 *   // ... game runs ...
 *   const snapshot = tracker.snapshot();
 *   //  → { Buffer: { created: 142, deleted: 100, net: 42 }, ... }
 *   tracker.stop();
 *
 * ## Caveats
 * - `gl.deleteX(null)` is a no-op but still increments the deleted counter.
 *   The `net` count is approximate; what matters for leak detection is the
 *   trend over time, not the absolute value.
 * - VertexArray methods only exist on WebGL2 contexts; patching is skipped
 *   if the method isn't present.
 */

const RESOURCE_TYPES = [
  'Buffer',
  'Texture',
  'Framebuffer',
  'Renderbuffer',
  'Program',
  'Shader',
  'VertexArray', // WebGL2 only
] as const;

type ResourceType = (typeof RESOURCE_TYPES)[number];

export type ResourceCounts = Record<
  ResourceType,
  { created: number; deleted: number; net: number }
>;

type GLContext = WebGLRenderingContext | WebGL2RenderingContext;

export class WebGLResourceTracker {
  private originals: Map<string, (...args: unknown[]) => unknown> = new Map();
  private counts: ResourceCounts;
  private started = false;

  constructor(private readonly gl: GLContext) {
    this.counts = this.emptyCounts();
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    for (const type of RESOURCE_TYPES) {
      this.patchMethod(`create${type}`, () => {
        this.counts[type].created++;
        this.counts[type].net++;
      });
      this.patchMethod(`delete${type}`, () => {
        this.counts[type].deleted++;
        this.counts[type].net--;
      });
    }
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;

    const glAsAny = this.gl as unknown as Record<string, unknown>;
    for (const [name, original] of this.originals) {
      glAsAny[name] = original;
    }
    this.originals.clear();
  }

  /** Returns a deep copy of the current counts so callers can compare snapshots. */
  snapshot(): ResourceCounts {
    const copy = this.emptyCounts();
    for (const type of RESOURCE_TYPES) {
      copy[type] = { ...this.counts[type] };
    }
    return copy;
  }

  /**
   * Returns a compact one-line summary of net counts for log output.
   *   "Buffer=42 Texture=18 Program=5 Framebuffer=2"
   * Resources with net=0 are omitted.
   */
  summary(): string {
    return RESOURCE_TYPES.filter((t) => this.counts[t].net !== 0)
      .map((t) => `${t}=${this.counts[t].net}`)
      .join(' ');
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private patchMethod(name: string, increment: () => void): void {
    const glAsAny = this.gl as unknown as Record<string, unknown>;
    const orig = glAsAny[name];
    if (typeof orig !== 'function') return; // method not present (e.g. VertexArray on WebGL1)

    const boundOrig = (orig as (...a: unknown[]) => unknown).bind(this.gl);
    this.originals.set(name, boundOrig);

    glAsAny[name] = function (...args: unknown[]) {
      increment();
      return boundOrig(...args);
    };
  }

  private emptyCounts(): ResourceCounts {
    const c = {} as ResourceCounts;
    for (const type of RESOURCE_TYPES) {
      c[type] = { created: 0, deleted: 0, net: 0 };
    }
    return c;
  }
}
