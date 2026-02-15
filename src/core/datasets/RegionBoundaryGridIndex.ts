import type { BBox } from 'geojson';

import type { BoundaryParams } from '../geometry/arc-length';
import { bboxIntersects, isCoordinateOutsideBBox } from '../geometry/helpers';

export class RegionBoundaryGridIndex {
  readonly cells: Map<number, Set<string | number>> = new Map();
  readonly cellWidth: number;
  readonly cellHeight: number;

  constructor(
    readonly datasetBBox: BBox,
    readonly xCells: number,
    readonly yCells: number,
  ) {
    const [minLng, minLat, maxLng, maxLat] = datasetBBox;
    this.cellWidth = (maxLng - minLng) / xCells;
    this.cellHeight = (maxLat - minLat) / yCells;
  }

  // TODO: If we pass in BBox values at Dataset load time, prefer those to calculating them from each individual feature in succession.
  static fromBoundaryParamsMap(
    regionBoundaryParamsMap: ReadonlyMap<string | number, BoundaryParams>,
    xCells: number,
    yCells: number,
  ): RegionBoundaryGridIndex | null {

    let minLng = Number.POSITIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;

    // Empty datasets are invalidated at load time, so there should be at least one feature
    for (const params of regionBoundaryParamsMap.values()) {
      const [featureMinLng, featureMinLat, featureMaxLng, featureMaxLat] = params.bbox;
      minLng = Math.min(minLng, featureMinLng);
      minLat = Math.min(minLat, featureMinLat);
      maxLng = Math.max(maxLng, featureMaxLng);
      maxLat = Math.max(maxLat, featureMaxLat);
    }

    const index = new RegionBoundaryGridIndex(
      [minLng, minLat, maxLng, maxLat],
      xCells,
      yCells,
    );

    for (const [featureId, params] of regionBoundaryParamsMap.entries()) {
      index.insertFeature(featureId, params.bbox);
    }

    return index;
  }

  queryByPoint(lng: number, lat: number): Set<string | number> {
    if (isCoordinateOutsideBBox(lng, lat, this.datasetBBox)) {
      return new Set<string | number>();
    }

    const x = this.resolveGridX(lng);
    const y = this.resolveGridY(lat);
    return new Set(this.cells.get(this.getGridCellKey(x, y)) ?? []);
  }

  queryByBBox(bbox: BBox): Set<string | number> {
    if (!bboxIntersects(this.datasetBBox, bbox)) {
      return new Set<string | number>();
    }

    const [minLng, minLat, maxLng, maxLat] = bbox;
    const xStart = this.resolveGridX(minLng);
    const xEnd = this.resolveGridX(maxLng);
    const yStart = this.resolveGridY(minLat);
    const yEnd = this.resolveGridY(maxLat);

    const candidates = new Set<string | number>();
    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        const cell = this.cells.get(this.getGridCellKey(x, y));
        if (!cell) continue;
        cell.forEach((featureId) => candidates.add(featureId));
      }
    }

    return candidates;
  }

  private insertFeature(featureId: string | number, bbox: BBox): void {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const xStart = this.resolveGridX(minLng);
    const xEnd = this.resolveGridX(maxLng);
    const yStart = this.resolveGridY(minLat);
    const yEnd = this.resolveGridY(maxLat);

    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        const key = this.getGridCellKey(x, y);
        if (!this.cells.has(key)) {
          this.cells.set(key, new Set<string | number>());
        }
        this.cells.get(key)!.add(featureId);
      }
    }
  }

  private getGridCellKey(x: number, y: number): number {
    return y * this.xCells + x;
  }

  private resolveGridX(indexLng: number): number {
    const [minLng, , maxLng] = this.datasetBBox;
    if (maxLng === minLng) return 0;

    const clampedLng = Math.min(maxLng, Math.max(minLng, indexLng));
    const rawIndex = Math.floor((clampedLng - minLng) / this.cellWidth);
    return Math.max(0, Math.min(this.xCells - 1, rawIndex));
  }

  private resolveGridY(indexLat: number): number {
    const [, minLat, , maxLat] = this.datasetBBox;
    if (maxLat === minLat) return 0;

    const clampedLat = Math.min(maxLat, Math.max(minLat, indexLat));
    const rawIndex = Math.floor((clampedLat - minLat) / this.cellHeight);
    return Math.max(0, Math.min(this.yCells - 1, rawIndex));
  }
}
