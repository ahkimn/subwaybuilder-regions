import path from 'node:path';

import { getLatestReleaseVersionFromChangelog } from './utils/release-version';

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const releaseVersion = getLatestReleaseVersionFromChangelog(changelogPath);

console.log(releaseVersion.withV);
