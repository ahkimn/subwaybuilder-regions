export const MODE_ORDER: (keyof ModeShare)[] = [
  'transit',
  'driving',
  'walking',
  'unknown',
] as const;
export type ModeKey = (typeof MODE_ORDER)[number];
export const MODE_LABEL: Record<ModeKey, string> = {
  transit: 'Transit',
  driving: 'Driving',
  walking: 'Walking',
  unknown: 'Unknown',
};

export type ModeShare = {
  transit: number; // Number of commuters using transit
  driving: number; // Number of commuters driving
  walking: number; // Number of commuters walking
  unknown: number; // Number of commuters with uncalculated mode choice
};

export const ModeShare = {
  createEmpty(): ModeShare {
    return {
      transit: 0,
      driving: 0,
      walking: 0,
      unknown: 0,
    };
  },
  add(a: ModeShare, b: ModeShare): ModeShare {
    return {
      transit: a.transit + b.transit,
      driving: a.driving + b.driving,
      walking: a.walking + b.walking,
      unknown: a.unknown + b.unknown,
    };
  },
  addInPlace(target: ModeShare, source: ModeShare): ModeShare {
    target.transit += source.transit;
    target.driving += source.driving;
    target.walking += source.walking;
    target.unknown += source.unknown;
    return target;
  },
  total(modeShare: ModeShare): number {
    return (
      modeShare.transit +
      modeShare.driving +
      modeShare.walking +
      modeShare.unknown
    );
  },
  totalOrUndefined(modeShare: ModeShare | undefined): number | undefined {
    return (modeShare && this.total(modeShare)) || undefined;
  },
  share(modeShare: ModeShare, mode: keyof ModeShare): number {
    const total = this.total(modeShare);
    if (total === 0) {
      return 0;
    }
    return modeShare[mode] / total;
  },
  ofMode(mode: keyof ModeShare, modeShare: ModeShare): ModeShare {
    return {
      transit: mode === 'transit' ? modeShare.transit : 0,
      driving: mode === 'driving' ? modeShare.driving : 0,
      walking: mode === 'walking' ? modeShare.walking : 0,
      unknown: mode === 'unknown' ? modeShare.unknown : 0,
    };
  },
};

// Commute type is the origin -> destination pair for a commute
export const CommuteType = {
  WorkToHome: 'WorkToHome',
  HomeToWork: 'HomeToWork',
  // Extend to leisure travel (e.g. Home to Leisure, Leisure to Home), etc. in the future
} as const satisfies Record<string, string>;

export type CommuteType = (typeof CommuteType)[keyof typeof CommuteType];
