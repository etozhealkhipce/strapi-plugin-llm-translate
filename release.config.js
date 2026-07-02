// One branch, two channels: pushes to main publish alphas, a manual
// workflow_dispatch run (RELEASE_CHANNEL=stable) promotes a stable release.
// semantic-release can't treat the same branch as both at once, hence the env switch.
const stable = process.env.RELEASE_CHANNEL === 'stable';

module.exports = {
  // semantic-release requires at least one non-prerelease branch in the config,
  // so alpha mode lists `semantic-release-anchor` — a remote branch that exists
  // solely to satisfy that rule and never receives pushes or releases.
  branches: stable
    ? ['main']
    : ['semantic-release-anchor', { name: 'main', prerelease: 'alpha', channel: 'alpha' }],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/github',
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'package-lock.json', 'CHANGELOG.md'],
        // [skip ci] keeps the release commit from re-triggering the workflow
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};
