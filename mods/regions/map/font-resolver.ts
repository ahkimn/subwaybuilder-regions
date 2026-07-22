// The game's `map://_fonts/` glyph endpoint serves a SINGLE font per request —
// it does NOT composite a comma-joined font stack (e.g. requesting
// `Noto Sans Medium,Noto Sans Regular` 404s). So `text-font` must resolve to
// one available font. We probe candidates one at a time and cache the first
// whose glyphs load, falling back to the first candidate if none can be probed
// (keeping the symbol layer valid even when probing isn't possible).

// Ordered by preference; the first that resolves is used.
export const LABEL_FONT_CANDIDATES: readonly string[] = [
  'Noto Sans Medium',
  'Noto Sans Regular',
];

export function glyphResourceUrl(font: string): string {
  // Matches the engine's request shape: map://_fonts/<font>/<range>.pbf.
  return `map://_fonts/${encodeURIComponent(font)}/0-255.pbf`;
}

export type FontProbe = (font: string) => Promise<boolean>;

async function defaultProbe(font: string): Promise<boolean> {
  try {
    const response = await fetch(glyphResourceUrl(font));
    return response.ok;
  } catch {
    return false;
  }
}

// Session cache: resolve once, then reuse for every layer / map re-bind.
let cachedFont: string | null = null;
let inFlight: Promise<string> | null = null;

/**
 * Resolve the label font to a single name the game's glyph endpoint serves.
 * Probes `candidates` in order (each as its own single-font request) and
 * returns the first available, caching it for the session. Returns the first
 * candidate as a last resort so the layer always has a valid font name.
 */
export function resolveLabelFont(
  candidates: readonly string[] = LABEL_FONT_CANDIDATES,
  probe: FontProbe = defaultProbe,
): Promise<string> {
  if (cachedFont) return Promise.resolve(cachedFont);
  if (inFlight) return inFlight;

  inFlight = (async () => {
    for (const font of candidates) {
      if (await probe(font)) return font;
    }
    return candidates[0] ?? '';
  })().then((font) => {
    cachedFont = font;
    inFlight = null;
    return font;
  });

  return inFlight;
}

// Test-only: clear the session cache between cases.
export function __resetLabelFontCacheForTests(): void {
  cachedFont = null;
  inFlight = null;
}
