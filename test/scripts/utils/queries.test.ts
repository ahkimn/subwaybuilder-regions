import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BoundaryBox } from '@scripts/utils/geometry';
import {
  bboxToWfsBbox,
  buildAUASGSBoundaryQuery,
  buildAUCensusPopulationQuery,
  buildIgnAdminWfsQuery,
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
});
