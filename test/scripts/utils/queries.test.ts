import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BoundaryBox } from '@scripts/utils/geometry';
import { bboxToWfsBbox, buildIgnAdminWfsQuery } from '@scripts/utils/queries';

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
});
