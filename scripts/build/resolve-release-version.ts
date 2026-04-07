import path from 'node:path';

import minimist from 'minimist';

import { getLatestReleaseVersionFromChangelog } from '../utils/release-version';

const argv = minimist(process.argv.slice(2), {
  string: ['changelog'],
});

const changelogRelPath: string =
  argv.changelog || path.join('docs', 'CHANGELOG.md');
const changelogPath = path.resolve(process.cwd(), changelogRelPath);
const releaseVersion = getLatestReleaseVersionFromChangelog(changelogPath);

console.log(releaseVersion.withV);
