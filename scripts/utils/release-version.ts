import { readFileSync } from 'node:fs';

export type ReleaseVersion = {
  bare: string;
  withV: string;
};

const CHANGELOG_VERSION_REGEX = /^##\s+v(\d+\.\d+\.\d+)\b/m;

export function getLatestReleaseVersionFromChangelog(
  changelogPath: string,
): ReleaseVersion {
  const changelog = readFileSync(changelogPath, 'utf8');
  const match = changelog.match(CHANGELOG_VERSION_REGEX);
  if (!match) {
    throw new Error(
      `Unable to resolve latest release version from changelog at ${changelogPath}`,
    );
  }

  const bare = match[1];
  return {
    bare,
    withV: `v${bare}`,
  };
}
