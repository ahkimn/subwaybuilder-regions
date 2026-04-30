/**
 * Continuously samples system-level performance signals that surface renderer
 * pressure even when JS heap, DOM, and WebGL resource counts look stable:
 *
 *   - Frame rate (via requestAnimationFrame)
 *       Degrades under any pressure: CPU, GPU, GC pauses, native cache misses.
 *   - Long tasks (via PerformanceObserver)
 *       Direct signal of main-thread blocking work, including GC pauses
 *       which are the smoking gun for native memory pressure.
 *   - WebGL errors (via gl.getError())
 *       GPU OOM surfaces here as OUT_OF_MEMORY (0x0505). Other errors point
 *       to driver-level resource exhaustion.
 *   - Electron process memory (via window.electron, if exposed)
 *       Some Electron preload bridges expose process.memoryUsage().
 *
 * ## Usage
 *   const monitor = new SystemPerformanceMonitor(gl);
 *   monitor.start();
 *   // ... during game ...
 *   const snapshot = monitor.snapshot();
 *   monitor.stop();
 *
 * The monitor maintains a 5-second rolling window for both frame timestamps
 * and long-task entries, so snapshot() returns recent-history metrics rather
 * than instantaneous values.
 */

const LOG = '[EnhancedDemandView][SystemPerformanceMonitor]';
const ROLLING_WINDOW_MS = 5_000;

// WebGL error codes for human-readable logging.
const GL_ERROR_NAMES: Record<number, string> = {
  0x0000: 'NO_ERROR',
  0x0500: 'INVALID_ENUM',
  0x0501: 'INVALID_VALUE',
  0x0502: 'INVALID_OPERATION',
  0x0503: 'STACK_OVERFLOW',
  0x0504: 'STACK_UNDERFLOW',
  0x0505: 'OUT_OF_MEMORY',
  0x0506: 'INVALID_FRAMEBUFFER_OPERATION',
  0x0507: 'CONTEXT_LOST_WEBGL',
};

type GLContext = WebGLRenderingContext | WebGL2RenderingContext;

export type SystemPerfSnapshot = {
  /** Frames rendered in the last 1s. ~60 = healthy, falling = pressure. */
  fps: number;
  /** P95 frame interval in ms over the rolling window. */
  frameTimeP95Ms: number;
  /** Long task count in the last 1s. Each represents > 50ms blocking work. */
  longTasksLastSecond: number;
  /** Total ms spent in long tasks in the last 1s. */
  longTasksTotalMs: number;
  /** WebGL errors accumulated since the last snapshot, by code. */
  glErrors: string[];
};

export class SystemPerformanceMonitor {
  private rafHandle: number | null = null;
  private frameTimestamps: number[] = [];

  private longTaskObserver: PerformanceObserver | null = null;
  private longTasks: Array<{ time: number; duration: number }> = [];

  private electronMemoryFn: (() => unknown) | null = null;
  private electronMemoryFnName: string | null = null;
  private electronProbed = false;

  constructor(private readonly gl: GLContext | null) {}

  start(): void {
    this.startFrameRateLoop();
    this.startLongTaskObserver();
    this.probeElectronMemoryAPI();
    this.logElectronSystemInfoOnce();
  }

  stop(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    if (this.longTaskObserver) {
      this.longTaskObserver.disconnect();
      this.longTaskObserver = null;
    }
  }

  /**
   * Returns a one-line human-readable summary suitable for inclusion in
   * captureMemory log output.
   */
  summary(): string {
    const s = this.snapshot();
    const parts = [
      `${s.fps} fps`,
      `p95 ${s.frameTimeP95Ms.toFixed(1)}ms`,
      `longtasks ${s.longTasksLastSecond} (${s.longTasksTotalMs.toFixed(0)}ms)`,
    ];
    if (s.glErrors.length > 0) parts.push(`gl: ${s.glErrors.join(',')}`);
    return parts.join(' | ');
  }

  snapshot(): SystemPerfSnapshot {
    const now = performance.now();

    // Frame rate over last 1s
    const oneSecondAgo = now - 1000;
    const recentFrames = this.frameTimestamps.filter((t) => t >= oneSecondAgo);
    const fps = recentFrames.length;

    // Frame interval p95 over the full rolling window
    const intervals: number[] = [];
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      intervals.push(this.frameTimestamps[i] - this.frameTimestamps[i - 1]);
    }
    intervals.sort((a, b) => a - b);
    const frameTimeP95Ms =
      intervals.length > 0
        ? (intervals[Math.floor(intervals.length * 0.95)] ?? 0)
        : 0;

    // Long tasks in last 1s
    const recentTasks = this.longTasks.filter((t) => t.time >= oneSecondAgo);
    const longTasksLastSecond = recentTasks.length;
    const longTasksTotalMs = recentTasks.reduce(
      (sum, t) => sum + t.duration,
      0,
    );

    // GL errors — drain the error queue, log each error code as a name
    const glErrors: string[] = [];
    if (this.gl) {
      let err = this.gl.getError();
      while (err !== this.gl.NO_ERROR) {
        glErrors.push(GL_ERROR_NAMES[err] ?? `0x${err.toString(16)}`);
        err = this.gl.getError();
        // Defensive: prevent infinite loop if context is broken.
        if (glErrors.length > 16) break;
      }
    }

    return {
      fps,
      frameTimeP95Ms,
      longTasksLastSecond,
      longTasksTotalMs,
      glErrors,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal: frame rate loop
  // ---------------------------------------------------------------------------

  private startFrameRateLoop(): void {
    const tick = () => {
      const now = performance.now();
      this.frameTimestamps.push(now);
      // Trim to rolling window
      const cutoff = now - ROLLING_WINDOW_MS;
      while (
        this.frameTimestamps.length > 0 &&
        this.frameTimestamps[0] < cutoff
      ) {
        this.frameTimestamps.shift();
      }
      this.rafHandle = requestAnimationFrame(tick);
    };
    this.rafHandle = requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------------------------
  // Internal: long task observer
  // ---------------------------------------------------------------------------

  private startLongTaskObserver(): void {
    if (typeof PerformanceObserver === 'undefined') {
      console.warn(
        `${LOG} PerformanceObserver unavailable — no long task tracking`,
      );
      return;
    }
    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        const cutoff = performance.now() - ROLLING_WINDOW_MS;
        for (const entry of list.getEntries()) {
          this.longTasks.push({
            time: entry.startTime,
            duration: entry.duration,
          });
        }
        this.longTasks = this.longTasks.filter((t) => t.time >= cutoff);
      });
      this.longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn(`${LOG} longtask observer failed to attach:`, e);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal: probe Electron preload bridge for memory APIs
  // ---------------------------------------------------------------------------

  /**
   * Walks `window.electron` looking for a memory-info function. The exact
   * shape is game-specific; we log what we find so it's clear which API is
   * in use (or that none is available).
   */
  private probeElectronMemoryAPI(): void {
    if (this.electronProbed) return;
    this.electronProbed = true;

    const electron = (window as unknown as Record<string, unknown>)['electron'];
    if (!electron || typeof electron !== 'object') {
      console.log(
        `${LOG} window.electron not present — no process memory probe`,
      );
      return;
    }

    const electronAsAny = electron as Record<string, unknown>;
    // Confirmed at runtime: subway-builder's preload exposes
    // window.electron.getSystemPerformanceInfo. Other names retained as
    // fallbacks for other Electron-based hosts.
    const candidateNames = [
      'getSystemPerformanceInfo',
      'getProcessMemoryInfo',
      'getMemoryUsage',
      'memoryUsage',
      'getMemoryInfo',
      'processMemoryUsage',
    ];

    for (const name of candidateNames) {
      const fn = electronAsAny[name];
      if (typeof fn === 'function') {
        this.electronMemoryFn = (fn as () => unknown).bind(electron);
        this.electronMemoryFnName = name;
        console.log(
          `${LOG} Found electron memory API: window.electron.${name}()`,
        );
        return;
      }
    }

    console.log(
      `${LOG} No memory API found on window.electron. Available keys:`,
      Object.keys(electronAsAny),
    );
  }

  /**
   * Calls the resolved electron memory API once at startup and logs the
   * result. For subway-builder's `getSystemPerformanceInfo` this returns
   * static system info (totalRAMGB, cpuCores, V8 heapSizeMB, platform) —
   * useful as one-time context but not a live process-memory signal. We do
   * not call it on every snapshot to avoid per-tick overhead.
   */
  private logElectronSystemInfoOnce(): void {
    if (!this.electronMemoryFn) return;
    try {
      const result = this.electronMemoryFn();
      const isPromise =
        !!result && typeof (result as Promise<unknown>).then === 'function';

      if (isPromise) {
        void (result as Promise<unknown>).then((m) => {
          if (m && typeof m === 'object') {
            console.log(
              `${LOG} system info via ${this.electronMemoryFnName}:`,
              m,
            );
          }
        });
      } else if (result && typeof result === 'object') {
        console.log(
          `${LOG} system info via ${this.electronMemoryFnName}:`,
          result,
        );
      }
    } catch (e) {
      console.warn(`${LOG} system info call failed:`, e);
    }
  }
}
