import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { UNASSIGNED_REGION_ID } from '@regions/core/constants';
import { resolveSankeySelectableUnitId } from '@regions/ui/panels/info/tabs/commuter-views/sankey';
import { resolveCommuterRowDoubleClick } from '@regions/ui/panels/info/tabs/commuter-views/table';
import { CommuterDimension } from '@regions/ui/panels/info/types';

// Guards the info-panel commuter navigation: double-clicking a region row in
// the Commuters → Region breakdown opens that counterpart region's info panel.
describe('resolveCommuterRowDoubleClick (commuter breakdown navigation)', () => {
  it('wires every column to select the region in the Region breakdown', () => {
    const selected: Array<string | number> = [];
    const handlers = resolveCommuterRowDoubleClick(
      CommuterDimension.Region,
      'LT13S12345',
      5,
      (id) => selected.push(id),
    );
    assert.ok(handlers, 'expected handlers for the Region dimension');
    assert.equal(handlers.length, 5, 'whole row (all columns) is navigable');
    // Double-clicking any cell selects the row's counterpart region.
    handlers[0]();
    handlers[4]();
    assert.deepEqual(selected, ['LT13S12345', 'LT13S12345']);
  });

  it('does not wire navigation for non-Region breakdowns (buckets are not regions)', () => {
    for (const dimension of [
      CommuterDimension.CommuteLength,
      CommuterDimension.CommuteHour,
    ]) {
      assert.equal(
        resolveCommuterRowDoubleClick(dimension, 42, 5, () => {}),
        undefined,
      );
    }
  });

  it('returns undefined when no select handler is provided', () => {
    assert.equal(
      resolveCommuterRowDoubleClick(CommuterDimension.Region, 'x', 5, undefined),
      undefined,
    );
  });
});

describe('resolveSankeySelectableUnitId (sankey node navigation)', () => {
  it('returns the feature id for real region sinks', () => {
    assert.equal(resolveSankeySelectableUnitId('LT13S12345', false), 'LT13S12345');
    assert.equal(resolveSankeySelectableUnitId(42, false), 42);
  });

  it('excludes the aggregate "Other Regions" and unassigned pseudo-region', () => {
    assert.equal(resolveSankeySelectableUnitId('Other Regions', true), undefined);
    assert.equal(
      resolveSankeySelectableUnitId(UNASSIGNED_REGION_ID, false),
      undefined,
    );
  });
});
