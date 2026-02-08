import fs from 'fs-extra';
import path from 'path';
import readline from "readline";
import { parse } from 'csv-parse/sync';
import { BoundaryBox } from './geometry';

export type Row = Record<string, string>;

// --- File Operations --- //

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
  } catch (err: any) {
    console.error(`Failed to load or parse GeoJSON file: ${filePath} with error: ${err.message}`);
    process.exit(1);
  }

  return geoJson;
}

export async function loadGeoJSONFromNDJSON(
  filePath: string
): Promise<GeoJSON.FeatureCollection> {
  validateFilePath(filePath);

  const features: GeoJSON.Feature[] = new Array<GeoJSON.Feature>();
  await loadFeatureFromNDJSON(filePath, (f) => features.push(f));

  return {
    type: "FeatureCollection",
    features: features
  };
}

async function loadFeatureFromNDJSON(
  filePath: string,
  onFeature: (f: GeoJSON.Feature) => void
): Promise<void> {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    onFeature(JSON.parse(line) as GeoJSON.Feature);
  }
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

export function loadBoundariesFromCSV(inputPath: string): Map<string, BoundaryBox> {
  const boundaries = new Map<string, BoundaryBox>();
  const rows = loadCSV(inputPath);

  for (const row of rows) {
    const code = row['Code'];
    const south = parseFloat(row['South']);
    const west = parseFloat(row['West']);
    const north = parseFloat(row['North']);
    const east = parseFloat(row['East']);

    if (code && !isNaN(south) && !isNaN(west) && !isNaN(north) && !isNaN(east)) {
      boundaries.set(code, { south, west, north, east });
    }
  }
  console.log(`Loaded ${boundaries.size} city boundaries from CSV.`);
  return boundaries;
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


export function updateIndexJson(indexPath: string, cityCode: string, dataType: string, displayName: string): void {
  validateFilePath(indexPath);
  const index = fs.readJsonSync(indexPath, { throws: false }) || {};

  if (!index[cityCode]) {
    index[cityCode] = [];
  }

  const existingEntry = index[cityCode].find((entry: any) => entry.id === dataType);
  if (!existingEntry) {
    index[cityCode].push({ id: dataType, name: displayName });
    fs.writeJsonSync(indexPath, index, { spaces: 2 });
    console.log(`Updated index.json for ${cityCode} with new dataset: ${displayName}`);
  } else {
    console.log(`Dataset ${displayName} already exists in index.json for ${cityCode}.`);
  }
}
