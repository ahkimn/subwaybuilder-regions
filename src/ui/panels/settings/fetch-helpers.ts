import type { RegistryCacheEntry } from '@shared/dataset-index';
import {
  isStaticCountryCode,
  type StaticCountryCode,
} from '@shared/datasets/catalog';

import { resolveStaticTemplateCountry } from '@/core/registry/static';
import type { City } from '@/types/cities';

export type FetchCountryCode = StaticCountryCode;
export type FetchBBox = {
  west: string;
  south: string;
  east: string;
  north: string;
};

export type FetchParameters = {
  cityCode: string;
  countryCode: FetchCountryCode | null;
  datasetIds: string[];
  bbox: FetchBBox | null;
};

export type LastCopiedFetchRequest = {
  cityCode: string;
  countryCode: FetchCountryCode;
  datasetIds: string[];
  copiedAt: number;
};

export type FetchValidationResult = {
  cityCode: string;
  foundIds: string[];
  missingIds: string[];
  updatedEntries: RegistryCacheEntry[];
  validatedAt: number;
};

export type FetchCommandContext = {
  platform: string;
  params: FetchParameters;
  relativeModPath: string;
  outPath?: string;
};

export function resolveCityCountryCode(
  city: City | undefined,
): FetchCountryCode | null {
  if (!city) {
    return null;
  }

  const resolvedCountry = resolveStaticTemplateCountry({
    code: city.code,
    country: city.country,
  });
  if (!resolvedCountry) {
    return null;
  }

  if (isStaticCountryCode(resolvedCountry)) {
    return resolvedCountry;
  }

  return null;
}

export function isWindowsPlatform(platform: string): boolean {
  return platform.toLowerCase() === 'win32';
}

export function formatFetchCommand({
  platform,
  params,
  relativeModPath,
  outPath = './data',
}: FetchCommandContext): string {
  const bbox = params.bbox;
  if (!bbox || !params.countryCode) {
    return '';
  }
  const normalizedRelativeModPath = normalizeRelativePath(relativeModPath);
  const scriptPath = normalizedRelativeModPath
    ? isWindowsPlatform(platform)
      ? `.\\${toWindowsPath(normalizedRelativeModPath)}\\fetch.ps1`
      : `./${normalizedRelativeModPath}/fetch.sh`
    : isWindowsPlatform(platform)
      ? '.\\fetch.ps1'
      : './fetch.sh';
  const scriptInvocation = isWindowsPlatform(platform)
    ? `& "${scriptPath}"`
    : scriptPath;
  const resolvedOutPath = outPath.length
    ? outPath
    : isWindowsPlatform(platform)
      ? normalizedRelativeModPath
        ? `.\\${toWindowsPath(normalizedRelativeModPath)}\\data`
        : '.\\data'
      : normalizedRelativeModPath
        ? `./${normalizedRelativeModPath}/data`
        : './data';
  const datasets = params.datasetIds.join(',');

  return [
    scriptInvocation,
    `--cityCode "${params.cityCode}"`,
    `--countryCode "${params.countryCode}"`,
    `--datasets "${datasets}"`,
    `--west ${bbox.west}`,
    `--south ${bbox.south}`,
    `--east ${bbox.east}`,
    `--north ${bbox.north}`,
    `--out "${resolvedOutPath}"`,
  ].join(' ');
}

export function buildFetchErrors(args: {
  hasCity: boolean;
  hasCountry: boolean;
  hasDatasets: boolean;
  hasBBox: boolean;
}): string[] {
  const errors: string[] = [];

  if (!args.hasCity) {
    errors.push('Select a city to generate a fetch command.');
  }
  if (!args.hasCountry) {
    errors.push('Selected city does not map to a supported fetch country.');
  }
  if (!args.hasDatasets) {
    errors.push('Select at least one dataset.');
  }
  if (!args.hasBBox) {
    errors.push(
      'Cannot generate command: demand data bbox unavailable for selected city.',
    );
  }

  return errors;
}

export function buildDefaultFetchOutPath(
  platform: string,
  relativeModPath: string,
): string {
  const normalizedRelativeModPath = normalizeRelativePath(relativeModPath);
  if (isWindowsPlatform(platform)) {
    return normalizedRelativeModPath
      ? `.\\${toWindowsPath(normalizedRelativeModPath)}\\data`
      : '.\\data';
  }
  return normalizedRelativeModPath
    ? `./${normalizedRelativeModPath}/data`
    : './data';
}

export async function copyTextWithFallback(text: string): Promise<boolean> {
  const clipboardApi = window.navigator?.clipboard;
  if (clipboardApi?.writeText) {
    try {
      await clipboardApi.writeText(text);
      return true;
    } catch {
      console.warn(
        'Failed to copy using navigator.clipboard API, falling back to execCommand method',
      );
    }
  }

  const doc = window.document;
  const textarea = doc.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';

  try {
    doc.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = doc.execCommand('copy');
    return copied;
  } catch {
    return false;
  } finally {
    if (textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  }
}

function normalizeRelativePath(pathValue: string): string {
  return pathValue
    .replace(/\\/g, '/')
    .replace(/^\.?\/+/, '')
    .replace(/\/+$/, '');
}

function toWindowsPath(pathValue: string): string {
  return pathValue.replace(/\//g, '\\');
}
