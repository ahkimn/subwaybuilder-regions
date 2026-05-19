import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import type { BoundaryBox } from '@scripts/utils/geometry';
import {
  bboxToWfsBbox,
  buildAUASGSBoundaryQuery,
  buildAUCensusPopulationQuery,
  buildIgnAdminWfsQuery,
  buildNomisPopulationQuery,
  decorateAcsKeyError,
  fetchNomisPopulationIndex,
  getWPCONSQuery,
  withCensusApiKey,
} from '@scripts/utils/queries';

describe('scripts/utils/queries WFS helpers', () => {
  const bbox: BoundaryBox = {
    west: 2.2,
    south: 48.8,
    east: 2.5,
    north: 49,
  };

  it('formats bbox for WFS with EPSG suffix', () => {
    assert.equal(bboxToWfsBbox(bbox), '2.2,48.8,2.5,49,EPSG:4326');
  });

  it('builds IGN admin WFS query params', () => {
    const request = buildIgnAdminWfsQuery(
      bbox,
      'ADMINEXPRESS-COG-CARTO.LATEST:commune',
    );

    assert.equal(request.url, 'https://data.geopf.fr/wfs/wfs');
    assert.equal(request.params.get('service'), 'WFS');
    assert.equal(request.params.get('version'), '2.0.0');
    assert.equal(request.params.get('request'), 'GetFeature');
    assert.equal(
      request.params.get('typeNames'),
      'ADMINEXPRESS-COG-CARTO.LATEST:commune',
    );
    assert.equal(request.params.get('srsName'), 'EPSG:4326');
    assert.equal(request.params.get('outputFormat'), 'application/json');
    assert.equal(request.params.get('bbox'), '2.2,48.8,2.5,49,EPSG:4326');
  });

  it('builds AU ASGS ArcGIS boundary query params', () => {
    const request = buildAUASGSBoundaryQuery(
      bbox,
      'SA3',
      0,
      'sa3_code_2021,sa3_name_2021',
    );

    assert.equal(
      request.url,
      'https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/SA3/MapServer/0/query',
    );
    assert.equal(request.params.get('where'), '1=1');
    assert.equal(request.params.get('geometryType'), 'esriGeometryEnvelope');
    assert.equal(request.params.get('spatialRel'), 'esriSpatialRelIntersects');
    assert.equal(request.params.get('inSR'), '4326');
    assert.equal(request.params.get('outSR'), '4326');
    assert.equal(
      request.params.get('outFields'),
      'sa3_code_2021,sa3_name_2021',
    );
    assert.equal(request.params.get('returnGeometry'), 'true');
    assert.equal(request.params.get('f'), 'json');
  });

  it('builds AU Census ArcGIS population query params', () => {
    const request = buildAUCensusPopulationQuery(
      bbox,
      3,
      'SA3_CODE_2021,Tot_P_P',
    );

    assert.equal(
      request.url,
      'https://services1.arcgis.com/v8Kimc579yljmjSP/arcgis/rest/services/ABS_2021_Census_G01_Selected_person_characteristics_by_sex_Beta/FeatureServer/3/query',
    );
    assert.equal(request.params.get('where'), '1=1');
    assert.equal(request.params.get('geometryType'), 'esriGeometryEnvelope');
    assert.equal(request.params.get('spatialRel'), 'esriSpatialRelIntersects');
    assert.equal(request.params.get('inSR'), '4326');
    assert.equal(request.params.get('outSR'), '4326');
    assert.equal(request.params.get('outFields'), 'SA3_CODE_2021,Tot_P_P');
    assert.equal(request.params.get('returnGeometry'), 'false');
    assert.equal(request.params.get('f'), 'json');
  });

  it('builds GB WPC ONS ArcGIS query params', () => {
    const request = getWPCONSQuery(bbox);

    assert.equal(
      request.url,
      'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Westminster_Parliamentary_Constituencies_July_2024_Boundaries_UK_BGC/FeatureServer/0/query',
    );
    assert.equal(request.params.get('where'), '1=1');
    assert.equal(request.params.get('geometryType'), 'esriGeometryEnvelope');
    assert.equal(request.params.get('spatialRel'), 'esriSpatialRelIntersects');
    assert.equal(request.params.get('inSR'), '4326');
    assert.equal(request.params.get('outSR'), '4326');
    assert.equal(request.params.get('outFields'), '*');
    assert.equal(request.params.get('returnGeometry'), 'true');
    assert.equal(request.params.get('f'), 'geojson');
  });
});

describe('scripts/utils/queries NOMIS helpers', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('builds NOMIS population query params', () => {
    const request = buildNomisPopulationQuery('NM_2014_1', 172);

    assert.equal(
      request.url,
      'https://www.nomisweb.co.uk/api/v01/dataset/NM_2014_1.data.csv',
    );
    assert.equal(request.params.get('geography'), 'TYPE172');
    assert.equal(request.params.get('gender'), '0');
    assert.equal(request.params.get('c_age'), '200');
    assert.equal(request.params.get('measures'), '20100');
    assert.equal(request.params.get('date'), 'latest');
  });

  it('fetches and parses NOMIS population CSV into index map', async () => {
    global.fetch = async () =>
      new Response(
        `"DATE","DATE_NAME","GEOGRAPHY_CODE","OBS_VALUE"\n"2024","2024","E14000001","12345"\n"2024","2024","E14000002","67890"`,
        {
          status: 200,
          headers: { 'content-type': 'text/csv' },
        },
      );

    const result = await fetchNomisPopulationIndex(
      buildNomisPopulationQuery('NM_2014_1', 172),
      { featureType: 'westminster parliamentary constituencies populations' },
    );

    assert.equal(result.resolvedDate, '2024');
    assert.equal(result.resolvedDateName, '2024');
    assert.equal(result.populationMap.get('E14000001'), '12345');
    assert.equal(result.populationMap.get('E14000002'), '67890');
  });

  it('throws clear error when NOMIS response is not CSV rows', async () => {
    global.fetch = async () =>
      new Response('<html>help page</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });

    await assert.rejects(
      fetchNomisPopulationIndex(buildNomisPopulationQuery('NM_2014_1', 172)),
      /Unexpected CSV response shape/,
    );
  });
});

describe('scripts/utils/queries Census API key helpers', () => {
  const originalKey = process.env.CENSUS_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.CENSUS_API_KEY;
    } else {
      process.env.CENSUS_API_KEY = originalKey;
    }
  });

  it('appends user-supplied CENSUS_API_KEY to URL when env var is set', () => {
    process.env.CENSUS_API_KEY = 'abc123';
    const url = withCensusApiKey(new URL('https://api.census.gov/data/2022/acs/acs5'));
    assert.equal(url.searchParams.get('key'), 'abc123');
  });

  it('trims whitespace from CENSUS_API_KEY', () => {
    process.env.CENSUS_API_KEY = '  abc123  ';
    const url = withCensusApiKey(new URL('https://api.census.gov/data/2022/acs/acs5'));
    assert.equal(url.searchParams.get('key'), 'abc123');
  });

  it('falls back to bundled default key when CENSUS_API_KEY is unset', () => {
    delete process.env.CENSUS_API_KEY;
    const url = withCensusApiKey(new URL('https://api.census.gov/data/2022/acs/acs5'));
    const key = url.searchParams.get('key');
    assert.ok(key && key.length > 0, 'expected a default key to be appended');
    // Sanity-check the key shape (40-char hex per Census Data API key format).
    assert.match(key!, /^[a-f0-9]{40}$/);
  });

  it('falls back to bundled default key when CENSUS_API_KEY is empty/whitespace', () => {
    process.env.CENSUS_API_KEY = '   ';
    const url = withCensusApiKey(new URL('https://api.census.gov/data/2022/acs/acs5'));
    const key = url.searchParams.get('key');
    assert.ok(key && key.length > 0);
    assert.match(key!, /^[a-f0-9]{40}$/);
  });

  it('rethrows missing-key errors with bundled-key guidance when env unset', () => {
    delete process.env.CENSUS_API_KEY;
    const upstream = new Error(
      'returned non-JSON response (text/html). Body starts with: <html><title>Missing Key</title>',
    );
    assert.throws(
      () => decorateAcsKeyError(upstream),
      /bundled Census API key was rejected.*Set CENSUS_API_KEY.*key_signup\.html/,
    );
  });

  it('rethrows missing-key errors with user-key guidance when env var is set', () => {
    process.env.CENSUS_API_KEY = 'bogus';
    const upstream = new Error('<title>Invalid Key</title>');
    assert.throws(
      () => decorateAcsKeyError(upstream),
      /CENSUS_API_KEY is set but Census rejected it/,
    );
  });

  it('passes through unrelated errors unchanged', () => {
    const upstream = new Error('network timeout after 10s');
    assert.throws(() => decorateAcsKeyError(upstream), /network timeout after 10s/);
  });
});
