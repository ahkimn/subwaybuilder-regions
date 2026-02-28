import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { getLatestReleaseVersionFromChangelog } from '../../../scripts/utils/release-version';

const fixturesDir = join(process.cwd(), 'testsrc/scripts/utils/fixtures');

describe('scripts/utils/release-version', () => {
  it('getLatestReleaseVersionFromChangelog_shouldReturnBareAndWithV_whenVersionHeadingIsValid', () => {
    const result = getLatestReleaseVersionFromChangelog(
      join(fixturesDir, 'changelog-valid-with-extra-text.md'),
    );

    assert.deepEqual(result, {
      bare: '1.2.3',
      withV: 'v1.2.3',
    });
  });

  it('getLatestReleaseVersionFromChangelog_shouldReturnFirstVersion_whenMultipleVersionHeadingsExist', () => {
    const result = getLatestReleaseVersionFromChangelog(
      join(fixturesDir, 'changelog-multiple-versions.md'),
    );

    assert.deepEqual(result, {
      bare: '9.8.7',
      withV: 'v9.8.7',
    });
  });

  it('getLatestReleaseVersionFromChangelog_shouldThrowInformativeError_whenVersionHeadingIsMissingOrInvalid', () => {
    const fixturePath = join(
      fixturesDir,
      'changelog-invalid-version-heading.md',
    );

    assert.throws(
      () => getLatestReleaseVersionFromChangelog(fixturePath),
      new Error(
        `Unable to resolve latest release version from changelog at ${fixturePath}`,
      ),
    );
  });
});
