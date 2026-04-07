// TODO (Minor Feature 1): Add this information to the demand data detail structure
export enum SpecialDemandType {
  Airport = 'AIR',
  Workplace = 'WRK',
  University = 'UNI',
}

export const SpecialDemandRegex = new RegExp(
  `^(${Object.values(SpecialDemandType).join('|')})_(.+)$`,
);
