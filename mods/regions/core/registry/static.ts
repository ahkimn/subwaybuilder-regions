import type { City } from '@lib/types/cities';
import type { DatasetMetadata } from '@regions/dataset-index';
import {
  buildDatasetTemplatesFromOrder,
  CATALOG_STATIC_COUNTRIES,
  resolveCountryDatasetOrder,
} from '@regions/datasets/catalog';

export type StaticDatasetTemplate = Omit<
  DatasetMetadata,
  'size' | 'fileSizeMB'
>;

const JP_RELEASE_CITY_CODES = [
  'AKJ', // Asahikawa
  'AOJ', // Aomori / Hirosaki
  'AXT', // Akita
  'FKJ', // Fukui
  'FKS', // Fukushima / Kōriyama
  'FOKK', // Fukuoka / Kitakyūshū
  'FSZ', // Shizuoka / Hamamatsu
  'FUK', // Fukuoka
  'GAJ', // Yamagata
  'HIJ', // Hiroshima
  'HKD', // Hakodate
  'HNA', // Hanamaki / Morioka
  'HSG', // Saga
  'ITM', // Ōsaka
  'IZO', // Nakaumi
  'KCZ', // Kōchi
  'KIJ', // Niigata
  'KMI', // Miyazaki
  'KKJ', // Kitakyūshū
  'KMJ', // Kumamoto
  'KMQ', // Kanazawa
  'KOJ', // Kagoshima
  'MMJ', // Matsumoto
  'MYJ', // Matsuyama
  'NGO', // Nagoya
  'NGS', // Nagasaki
  'OIT', // Ōita
  'OKA', // Okinawa
  'OKJ', // Okayama
  'QEB', // Maebashi
  'QIS', // Mito / Hitachi
  'QFY', // Fukuyama
  'QNG', // Nagano
  'QUT', // Utsunomiya
  'SDJ', // Sendai
  'SKK', // Shikoku
  'SPK', // Sapporo
  'TAK', // Takamatsu
  'TKS', // Tokushima
  'TOY', // Toyama
  'TTJ', // Tottori
  'UKB', // Kōbe
  'UKY', // Kyōto
  'WKY', // Wakayama
] as const;


const CZ_RELEASE_CITY_CODES = [
  'BRQ', // Brno
  'HKP', // Hradec Králové - Pardubice
  'OLO', // Olomouc
  'OSR', // Ostrava
  'PLZ', // Plzeň
  'PRG', // Praha
  'UCH', // Ústí nad Labem - Chomutov
] as const;

export const STATIC_CUSTOM_CITY_COUNTRY_MAPPING: Readonly<
  Record<string, string>
> = Object.freeze({
  TOR: 'CA', // Toronto
  MON: 'CA', // Montreal
  OTT: 'CA', // Ottawa
  VAN: 'CA', // Vancouver
  CGY: 'CA', // Calgary
  EDM: 'CA', // Edmonton
  WPG: 'CA', // Winnipec
  QC: 'CA', // Quebec City
  ...Object.fromEntries(
    JP_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'JP']),
  ),
  ...Object.fromEntries(
    CZ_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'CZ'])
  ),
});

export const STATIC_TEMPLATES: Map<string, readonly StaticDatasetTemplate[]> =
  new Map(
    CATALOG_STATIC_COUNTRIES.map((countryCode) => {
      const orderedDatasetIds = resolveCountryDatasetOrder(countryCode);
      return [countryCode, buildDatasetTemplatesFromOrder(orderedDatasetIds)];
    }),
  );

function normalizeTemplateCountryCode(countryCode: string): string {
  if (countryCode === 'UK') {
    return 'GB';
  }
  return countryCode;
}

function normalizeTemplateCityCode(cityCode: string): string {
  const normalizedCode = cityCode.trim().toUpperCase();
  if (/^[A-Z]{3}X$/.test(normalizedCode)) {
    return normalizedCode.slice(0, 3);
  }
  return normalizedCode;
}

export function resolveStaticTemplateCountry(
  city: Pick<City, 'code' | 'country'>,
): string | null {
  if (city.country) {
    const normalizedCountry = normalizeTemplateCountryCode(city.country);
    if (STATIC_TEMPLATES.has(normalizedCountry)) {
      return normalizedCountry;
    }
  }

  const mappedCountry =
    STATIC_CUSTOM_CITY_COUNTRY_MAPPING[normalizeTemplateCityCode(city.code)];
  if (!mappedCountry) {
    return null;
  }

  const normalizedMappedCountry = normalizeTemplateCountryCode(mappedCountry);
  if (!STATIC_TEMPLATES.has(normalizedMappedCountry)) {
    return null;
  }

  return normalizedMappedCountry;
}
