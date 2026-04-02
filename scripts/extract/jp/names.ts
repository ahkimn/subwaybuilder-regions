import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

import type { GeoBoundaryFeature } from './types';

const JAPANESE_TEXT_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;
const CHOME_SUFFIX_RE =
  /(?:[0-9\uFF10-\uFF19]+|[\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341\u767E\u3007\u96F6]+)\u4E01\u76EE$/;
const ROMAJI_INITIAL_RE = /^[a-z\u0101\u0113\u012b\u014d\u016b]/i;
const DIACRITIC_MAP: ReadonlyArray<readonly [string, string]> = [
  ['ou', 'ō'],
  ['oo', 'ō'],
  ['aa', 'ā'],
  ['ii', 'ī'],
  ['uu', 'ū'],
  ['ee', 'ē'],
];
const ROMAJI_OVERRIDES = new Map<string, string>([
  ['葛尾', 'Katsurao'],
  ['葛尾村', 'Katsurao Mura'],
]);

let kuroshiroInitPromise: Promise<Kuroshiro> | null = null;
const romajiCache = new Map<string, Promise<string>>();

export function cleanLabelName(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text || ['nan', 'none', 'null'].includes(text.toLowerCase())) {
    return '';
  }
  return text;
}

// For oaza/koaza names, we often have redundant suffixes like "丁目" that do
// not add much value to the higher-level display label.
export function collapseOazaName(value: unknown): string {
  const text = cleanLabelName(value).replace(/\s+/g, '');
  if (!text) {
    return '';
  }

  const collapsed = text.replace(CHOME_SUFFIX_RE, '');
  return collapsed || text;
}

function findAzaSeparatorIndex(value: string): number {
  let searchStart = 0;

  while (searchStart < value.length) {
    const separatorIndex = value.indexOf('字', searchStart);
    if (separatorIndex < 0) {
      return -1;
    }

    // Skip the "字" in "大字"; if there is another later "字", that later one is
    // the aza separator we want to strip when collapsing to the ooaza label.
    if (separatorIndex > 0 && value[separatorIndex - 1] === '大') {
      searchStart = separatorIndex + 1;
      continue;
    }

    return separatorIndex;
  }

  return -1;
}

export function deriveOoazaName(value: unknown): string {
  const text = cleanLabelName(value).replace(/\s+/g, '');
  if (!text) {
    return '';
  }

  const azaSeparatorIndex = findAzaSeparatorIndex(text);
  if (azaSeparatorIndex > 0) {
    return text.slice(0, azaSeparatorIndex);
  }

  return collapseOazaName(text);
}

function applyDiacritics(value: string): string {
  let output = value;
  for (const [source, target] of DIACRITIC_MAP) {
    output = output.split(source).join(target);
  }
  return output;
}

function titleCaseRomaji(value: string): string {
  return value
    .split(/(\s+|-)/)
    .filter(Boolean)
    .map((token) => {
      if (/^\s+$/.test(token) || token === '-') {
        return token;
      }
      if (!ROMAJI_INITIAL_RE.test(token)) {
        return token;
      }

      const [firstChar, ...restChars] = Array.from(token);
      return `${firstChar.toLocaleUpperCase('en-US')}${restChars.join('')}`;
    })
    .join('');
}

function deAssimilateSyllabicN(value: string): string {
  // Prefer "n" over assimilated "m" before labial consonants so names such as
  // "Nihonmatsu" are preserved instead of "Nihommatsu".
  return value.replace(/([aeiou])m(?=[bmp])/g, '$1n');
}

async function getKuroshiro(): Promise<Kuroshiro> {
  if (!kuroshiroInitPromise) {
    kuroshiroInitPromise = (async () => {
      const kuroshiro = new Kuroshiro();
      await kuroshiro.init(new KuromojiAnalyzer());
      return kuroshiro;
    })();
  }

  return kuroshiroInitPromise;
}

export async function romanizeJapaneseName(nameJa: string): Promise<string> {
  const normalizedName = cleanLabelName(nameJa);
  if (!normalizedName) {
    return '';
  }
  if (!JAPANESE_TEXT_RE.test(normalizedName)) {
    return normalizedName;
  }

  const override = ROMAJI_OVERRIDES.get(normalizedName);
  if (override) {
    return override;
  }

  const cachedPromise = romajiCache.get(normalizedName);
  if (cachedPromise) {
    return cachedPromise;
  }

  const conversionPromise = (async () => {
    try {
      const kuroshiro = await getKuroshiro();
      const converted = await kuroshiro.convert(normalizedName, {
        to: 'romaji',
        mode: 'spaced',
        romajiSystem: 'hepburn',
      });
      const collapsed = converted.replace(/\s+/g, ' ').trim().toLowerCase();
      return titleCaseRomaji(
        applyDiacritics(deAssimilateSyllabicN(collapsed)),
      );
    } catch (error) {
      console.warn(
        `[JP] Failed to romanize name "${normalizedName}". Falling back to Japanese.`,
        error,
      );
      return normalizedName;
    }
  })();

  romajiCache.set(normalizedName, conversionPromise);
  return conversionPromise;
}

export function formatBilingualName(nameJa: string, nameEn: string): string {
  const normalizedJa = cleanLabelName(nameJa);
  const normalizedEn = cleanLabelName(nameEn);
  return normalizedEn ? `${normalizedJa}\n${normalizedEn}` : normalizedJa;
}

export function selectDominantOazaName(
  weightedNames: ReadonlyMap<string, number>,
): string {
  return (
    Array.from(weightedNames.entries()).sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0], 'ja');
    })[0]?.[0] ?? ''
  );
}

export function resolveShichousonJapaneseName(
  feature: GeoBoundaryFeature,
  municipalityCode: string,
): string {
  const cityName = cleanLabelName(feature.properties?.N03_004);
  const wardName = cleanLabelName(feature.properties?.N03_005);
  if (!cityName) {
    throw new Error(
      `[JP] Missing N03_004 municipality name for municipality code ${municipalityCode}.`,
    );
  }
  if (cityName && wardName) {
    return `${cityName}${wardName}`;
  }
  return cityName;
}
