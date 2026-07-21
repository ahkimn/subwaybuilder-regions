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

// Complete jp-data JP bundle set (all maps, including those not yet published
// to subwaybuilder-jp-maps). Kept in sync with jp-data source_data/bundles.
const JP_RELEASE_CITY_CODES = [
  'AKJ', // Asahikawa
  'AOJ', // Tsugaru (Aomori / Hirosaki)
  'AXT', // Akita
  'FKJ', // Fukui
  'FKS', // Nakadōri (Fukushima / Kōriyama)
  'FOKK', // Northern Kyūshū (Fukuoka / Kitakyūshū)
  'FSZ', // Shizuoka / Hamamatsu
  'FUK', // Fukuoka
  'GAJ', // Yamagata
  'HIJ', // Hiroshima
  'HKD', // Hakodate
  'HNA', // Morioka
  'ITM', // Ōsaka
  'IZO', // Nakaumi
  'KCZ', // Kōchi
  'KFU', // Kōfu
  'KHS', // Keihanshin
  'KIJ', // Niigata
  'KKJ', // Kitakyūshū
  'KMI', // Miyazaki
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
  'QFY', // Fukuyama
  'QIS', // Mito / Hitachi
  'QNG', // Nagano
  'QUT', // Utsunomiya
  'SDJ', // Sendai
  'SHB', // Nemuro
  'SPK', // Sapporo
  'TAK', // Takamatsu
  'TKS', // Tokushima
  'TOY', // Toyama
  'TTJ', // Tottori
  'UBJ', // Yamaguchi
  'UKB', // Kōbe / Himeji
  'UKY', // Kyōto
  'WKJ', // Wakkanai
] as const;

const CZ_RELEASE_CITY_CODES = [
  'BRQ', // Brno
  'CBS', // České Budějovice
  'HKP', // Hradec Králové - Pardubice
  'JIH', // Jihlava
  'KVY', // Karlovy Vary
  'LBC', // Liberec - Jablonec
  'OLO', // Olomouc
  'OSR', // Ostrava
  'PLZ', // Plzeň
  'PRG', // Praha
  'UCH', // Ústí nad Labem - Chomutov
  'ZLN', // Zlin
] as const;

const PL_RELEASE_CITY_CODES = [
  'BTK', // Białystok
  'BZG', // Bydgoszcz - Toruń
  'CZE', // Częstochowa
  'GDN', // Gdańsk
  'IEG', // Zielona Góra
  'KIE', // Kielce
  'KRK', // Kraków
  'KTW', // Katowice - GZM
  'LCJ', // Łódź
  'LEG', // Legnica
  'LUZ', // Lublin
  'OPL', // Opole
  'POZ', // Poznań
  'RDO', // Radom
  'RZE', // Rzeszów
  'SLE', // Silesia (Katowice - Ostrava metro)
  'SZY', // Olsztyn
  'SZZ', // Szczecin
  'WAR', // Warszawa
  'WRO', // Wrocław
] as const;

const TW_RELEASE_CITY_CODES = [
  'TPE', // Taipei
  'RMQ', // Taichung
  'KHH', // Kaohsiung
  'TNN', // Tainan
  'HSZ', // Hsinchu
  'CYI', // Chiayi
] as const;

const PE_RELEASE_CITY_CODES = [
  'LIM', // Lima
  'AQP', // Arequipa
  'TRU', // Trujillo
  'CIX', // Chiclayo
  'PIU', // Piura
  'IQT', // Iquitos
  'CUZ', // Cusco
  'CHM', // Chimbote
  'JAU', // Huancayo/Jauja
] as const;

const CN_RELEASE_CITY_CODES = [
  'SHA', // Shanghai
  'SZX', // Shenzhen
  'CAN', // Guangzhou
  'PEK', // Beijing
  'CKG', // Chongqing
  'CTU', // Chengdu
] as const;

const EE_RELEASE_CITY_CODES = [
  'TLL', // Tallinn
  'TAY', // Tartu
  'EPU', // Pärnu
  'IDV', // Ida-Viru
] as const;

const UA_RELEASE_CITY_CODES = [
  'LWO', // Lviv
  'ODS', // Odesa
  'KBP', // Kyiv
  'HRK', // Kharkiv
  'DNK', // Dnipro
  'OZH', // Zaporizhzhia
  'KWG', // Kryvyi Rih
] as const;

const LV_RELEASE_CITY_CODES = [
  'RIX', // Rīga
  'DGV', // Daugavpils
  'LPX', // Liepāja
] as const;

const LT_RELEASE_CITY_CODES = [
  'VNO', // Vilnius
  'KUN', // Kaunas
  'PLQ', // Klaipėda
  'PNV', // Panevėžys
  'SQQ', // Šiauliai
] as const;

export const STATIC_CUSTOM_CITY_COUNTRY_MAPPING: Readonly<
  Record<string, string>
> = Object.freeze({
  ...Object.fromEntries(
    JP_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'JP']),
  ),
  ...Object.fromEntries(
    CZ_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'CZ']),
  ),
  ...Object.fromEntries(
    PL_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'PL']),
  ),
  ...Object.fromEntries(
    TW_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'TW']),
  ),
  ...Object.fromEntries(
    PE_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'PE']),
  ),
  ...Object.fromEntries(
    CN_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'CN']),
  ),
  ...Object.fromEntries(
    EE_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'EE']),
  ),
  ...Object.fromEntries(
    UA_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'UA']),
  ),
  ...Object.fromEntries(
    LV_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'LV']),
  ),
  ...Object.fromEntries(
    LT_RELEASE_CITY_CODES.map((cityCode) => [cityCode, 'LT']),
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
