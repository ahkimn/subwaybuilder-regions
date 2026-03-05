import { gunzipSync } from 'zlib';

import { isFeatureCollection } from './geometry';
import { fetchBytesWithRetry } from './http';

function isGzipBuffer(payload: Buffer): boolean {
  return payload.length >= 2 && payload[0] === 0x1f && payload[1] === 0x8b;
}

function decodeRemotePayload(url: string, payload: Buffer): string {
  if (!isGzipBuffer(payload)) {
    return payload.toString('utf8');
  }

  try {
    return gunzipSync(payload).toString('utf8');
  } catch (error) {
    throw new Error(
      `[RemoteData] Failed to decompress gzip payload from ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// For some datasets, we will fetch directly from remotely hosted geojsons (e.g. those on a Github repository) instead of directly from a REST API such as ArcGIS.
export async function loadRemoteGeoJSON(
  url: string,
): Promise<GeoJSON.FeatureCollection> {
  let payload: Buffer;
  try {
    payload = await fetchBytesWithRetry(url, undefined, {
      label: 'RemoteData',
    });
  } catch (error) {
    throw new Error(
      `[RemoteData] Failed to fetch ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  // Conditionally decode if the geojson is hosted as a .gz archive
  const decodedPayload = decodeRemotePayload(url, payload);

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodedPayload);
  } catch (error) {
    throw new Error(
      `[RemoteData] Failed to parse JSON payload from ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  // Reject any responses that are not GeoJSON Feature Collections
  if (!isFeatureCollection(parsed as GeoJSON.GeoJSON)) {
    const responseType =
      typeof parsed === 'object' && parsed !== null && 'type' in parsed
        ? String((parsed as { type?: unknown }).type)
        : typeof parsed;
    throw new Error(
      `[RemoteData] Expected FeatureCollection from ${url}, got ${responseType}`,
    );
  }

  return parsed as GeoJSON.FeatureCollection;
}
