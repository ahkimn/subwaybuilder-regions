import fs from 'fs-extra';
import path from 'path';
import { parse } from 'csv-parse/sync';

export type Row = Record<string, string>;

export function requireString(
  value: any,
  name: string
): string {
  if (typeof value !== 'string' || value.length === 0) {
    console.error(`Missing or invalid argument: --${name}`);
    process.exit(1);
  }
  return value;
}

export function requireNumber(
  value: any,
  name: string
): number {  
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  console.error(`Missing or invalid argument: --${name}`);
  process.exit(1);
}

export function validateFilePath(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    console.error(`Input file does not exist: ${filePath}`);
    process.exit(1);
  }
}

export function loadGeoJSON(filePath: string): GeoJSON.FeatureCollection {
  validateFilePath(filePath);
  let geoJson: GeoJSON.FeatureCollection;
  try {
    const loadedJson = fs.readJsonSync(filePath);
    geoJson = loadedJson as GeoJSON.FeatureCollection;
  } catch {
    console.error(`Failed to load or parse GeoJSON file: ${filePath}`);
    process.exit(1);
  }

  return geoJson;
}

export function saveGeoJSON(
  filePath: string,
  featureCollection: GeoJSON.FeatureCollection
): void {
  try {
    console.info(`Saving GeoJSON to: ${filePath}`);
    const saveDirectory = path.dirname(filePath);

    // Ensure directory exists
    fs.ensureDirSync(saveDirectory);
    fs.writeJsonSync(`${filePath}.tmp`, featureCollection, { spaces: 2 });
    fs.moveSync(`${filePath}.tmp`, filePath, { overwrite: true });

    console.info(`Saved GeoJSON to: ${filePath}`);
  } catch (err) {
    console.error(`Failed to save GeoJSON to: ${filePath} with error: ${err}`);
    process.exit(1);
  }
}

export function loadCSV(filePath: string): Array<Row> {
  validateFilePath(filePath);
  const csvContent: string = fs.readFileSync(filePath, 'utf8');
  const records: Row[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  return records;
}

export function buildCSVIndex(rows: Row[], keyColumn: string, valueColumn: string): Map<string, string> {
  const index = new Map<string, string>();

  for (const row of rows) {
    const key = row[keyColumn];
    const value = row[valueColumn];
    if (key && value) {
      index.set(key, value);
    }
  }
  return index;
}

export function parseNumber(
  value: string
): number | undefined {
  const normalizedValue = value.replace(/,/g, '').trim();
  const parsedNumber = Number(normalizedValue);

  return Number.isFinite(parsedNumber) ? parsedNumber : undefined;
}