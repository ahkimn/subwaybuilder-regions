export const SOURCE_PREFIX = 'regions-src';
export const LAYER_PREFIX = 'regions-layer';
/*
For certain region layers, not all demand points will be assigned to a region.

This constant can be used as a key in the demand data maps to track the demand from these unassigned points.
*/
export const UNASSIGNED_REGION_ID = 'UNASSIGNED';

export const REGION_BOUNDARY_GRID_X_CELLS = 32; // Number of horizontal cells for dataset boundary acceleration grid
export const REGION_BOUNDARY_GRID_Y_CELLS = 32; // Number of vertical cells for dataset boundary acceleration grid

export const OVERVIEW_REGION_FOCUS_TARGET_COVERAGE = 0.5; // Target map coverage for overview row focus action (roughly half of viewport width/height)
export const OVERVIEW_REGION_FOCUS_MIN_PADDING_PX = 48; // Minimum fitBounds padding on each side for overview row focus
export const OVERVIEW_REGION_FOCUS_MAX_PADDING_PX = 280; // Maximum fitBounds padding on each side for overview row focus
export const OVERVIEW_REGION_FOCUS_MAX_ZOOM = 12; // Max zoom when focusing a region from overview to avoid over-zooming very small regions
export const OVERVIEW_REGION_FOCUS_DURATION_MS = 700; // Camera transition duration for overview row focus
export const OVERVIEW_REGION_FOCUS_MIN_BBOX_SPAN_DEGREES = 0.0025; // Minimum lng/lat span used when normalizing tiny or degenerate region bboxes
