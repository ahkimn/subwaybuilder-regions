export type RegionSelection = {
  datasetIdentifier: string;
  featureId: string | number;
};

export const RegionSelection = {
  isEqual(a: RegionSelection | null, b: RegionSelection | null): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return (
      a.datasetIdentifier === b.datasetIdentifier && a.featureId === b.featureId
    );
  },
};
